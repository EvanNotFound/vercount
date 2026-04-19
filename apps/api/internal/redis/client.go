package redis

import (
	"bufio"
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Client struct {
	url    *url.URL
	mu     sync.Mutex
	conn   net.Conn
	reader *bufio.Reader
	writer *bufio.Writer
}

func New(rawURL string) (*Client, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}

	return &Client{url: parsed}, nil
}

func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.closeConn()
}

func (c *Client) Do(ctx context.Context, command string, args ...any) (any, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if err := c.ensureConn(ctx); err != nil {
		return nil, err
	}

	return c.doLocked(ctx, command, args...)
}

func (c *Client) doLocked(ctx context.Context, command string, args ...any) (any, error) {
	if err := c.setDeadline(ctx); err != nil {
		return nil, err
	}

	if err := writeCommand(c.writer, command, args...); err != nil {
		_ = c.closeConn()
		return nil, err
	}

	if err := c.writer.Flush(); err != nil {
		_ = c.closeConn()
		return nil, err
	}

	response, err := readReply(c.reader)
	if err != nil {
		_ = c.closeConn()
		return nil, err
	}

	return response, nil
}

func (c *Client) ensureConn(ctx context.Context) error {
	if c.conn != nil {
		return nil
	}

	conn, err := c.dial(ctx)
	if err != nil {
		return err
	}

	c.conn = conn
	c.reader = bufio.NewReader(conn)
	c.writer = bufio.NewWriter(conn)

	if err := c.auth(ctx); err != nil {
		_ = c.closeConn()
		return err
	}

	if err := c.selectDB(ctx); err != nil {
		_ = c.closeConn()
		return err
	}

	return nil
}

func (c *Client) dial(ctx context.Context) (net.Conn, error) {
	host := c.url.Host
	if !strings.Contains(host, ":") {
		host += ":6379"
	}

	var d net.Dialer
	if deadline, ok := ctx.Deadline(); ok {
		d.Timeout = time.Until(deadline)
	} else {
		d.Timeout = 5 * time.Second
	}

	switch c.url.Scheme {
	case "redis":
		return d.DialContext(ctx, "tcp", host)
	case "rediss":
		return tls.DialWithDialer(&d, "tcp", host, &tls.Config{ServerName: c.url.Hostname()})
	default:
		return nil, fmt.Errorf("unsupported redis scheme: %s", c.url.Scheme)
	}
}

func (c *Client) setDeadline(ctx context.Context) error {
	if deadline, ok := ctx.Deadline(); ok {
		return c.conn.SetDeadline(deadline)
	}
	return c.conn.SetDeadline(time.Now().Add(5 * time.Second))
}

func (c *Client) auth(ctx context.Context) error {
	password, hasPassword := c.url.User.Password()
	username := ""
	if c.url.User != nil {
		username = c.url.User.Username()
	}

	if username == "" && !hasPassword {
		return nil
	}

	if username != "" {
		_, err := c.doLocked(ctx, "AUTH", username, password)
		return err
	}

	_, err := c.doLocked(ctx, "AUTH", password)
	return err
}

func (c *Client) selectDB(ctx context.Context) error {
	db := strings.TrimPrefix(c.url.Path, "/")
	if db == "" {
		return nil
	}

	_, err := c.doLocked(ctx, "SELECT", db)
	return err
}

func (c *Client) closeConn() error {
	if c.conn == nil {
		return nil
	}
	err := c.conn.Close()
	c.conn = nil
	c.reader = nil
	c.writer = nil
	return err
}

func writeCommand(writer *bufio.Writer, command string, args ...any) error {
	parts := make([]string, 0, len(args)+1)
	parts = append(parts, command)
	for _, arg := range args {
		parts = append(parts, toBulkString(arg))
	}

	if _, err := writer.WriteString(fmt.Sprintf("*%d\r\n", len(parts))); err != nil {
		return err
	}

	for _, part := range parts {
		if _, err := writer.WriteString(fmt.Sprintf("$%d\r\n%s\r\n", len(part), part)); err != nil {
			return err
		}
	}

	return nil
}

func readReply(reader *bufio.Reader) (any, error) {
	prefix, err := reader.ReadByte()
	if err != nil {
		return nil, err
	}

	line, err := readLine(reader)
	if err != nil {
		return nil, err
	}

	switch prefix {
	case '+':
		return line, nil
	case '-':
		return nil, errors.New(line)
	case ':':
		return strconv.ParseInt(line, 10, 64)
	case '$':
		length, err := strconv.Atoi(line)
		if err != nil {
			return nil, err
		}
		if length == -1 {
			return nil, nil
		}

		buffer := make([]byte, length+2)
		if _, err := io.ReadFull(reader, buffer); err != nil {
			return nil, err
		}

		return string(buffer[:length]), nil
	case '*':
		count, err := strconv.Atoi(line)
		if err != nil {
			return nil, err
		}
		if count == -1 {
			return nil, nil
		}

		items := make([]any, count)
		for i := 0; i < count; i++ {
			item, err := readReply(reader)
			if err != nil {
				return nil, err
			}
			items[i] = item
		}

		return items, nil
	default:
		return nil, fmt.Errorf("unsupported redis reply prefix: %q", prefix)
	}
}

func readLine(reader *bufio.Reader) (string, error) {
	line, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimSuffix(strings.TrimSuffix(line, "\n"), "\r"), nil
}

func toBulkString(value any) string {
	switch v := value.(type) {
	case string:
		return v
	case []byte:
		return string(v)
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case bool:
		if v {
			return "1"
		}
		return "0"
	default:
		return fmt.Sprint(v)
	}
}

func (c *Client) Get(ctx context.Context, key string) (string, bool, error) {
	value, err := c.Do(ctx, "GET", key)
	if err != nil {
		return "", false, err
	}
	if value == nil {
		return "", false, nil
	}

	text, ok := value.(string)
	if !ok {
		return "", false, fmt.Errorf("unexpected GET reply type: %T", value)
	}

	return text, true, nil
}

func (c *Client) SetEX(ctx context.Context, key string, value any, ttl int64) error {
	_, err := c.Do(ctx, "SET", key, value, "EX", ttl)
	return err
}

func (c *Client) Expire(ctx context.Context, key string, ttl int64) error {
	_, err := c.Do(ctx, "EXPIRE", key, ttl)
	return err
}

func (c *Client) Incr(ctx context.Context, key string) (int64, error) {
	value, err := c.Do(ctx, "INCR", key)
	if err != nil {
		return 0, err
	}

	count, ok := value.(int64)
	if !ok {
		return 0, fmt.Errorf("unexpected INCR reply type: %T", value)
	}

	return count, nil
}

func (c *Client) SAdd(ctx context.Context, key string, members ...string) error {
	args := make([]any, 0, len(members)+1)
	args = append(args, key)
	for _, member := range members {
		args = append(args, member)
	}
	_, err := c.Do(ctx, "SADD", args...)
	return err
}

func (c *Client) SCard(ctx context.Context, key string) (int64, error) {
	value, err := c.Do(ctx, "SCARD", key)
	if err != nil {
		return 0, err
	}

	count, ok := value.(int64)
	if !ok {
		return 0, fmt.Errorf("unexpected SCARD reply type: %T", value)
	}

	return count, nil
}

func (c *Client) ZAdd(ctx context.Context, key string, score int64, member string) error {
	_, err := c.Do(ctx, "ZADD", key, score, member)
	return err
}

func (c *Client) ZRemRangeByScore(ctx context.Context, key string, min string, max string) error {
	_, err := c.Do(ctx, "ZREMRANGEBYSCORE", key, min, max)
	return err
}

func (c *Client) ZCard(ctx context.Context, key string) (int64, error) {
	value, err := c.Do(ctx, "ZCARD", key)
	if err != nil {
		return 0, err
	}

	count, ok := value.(int64)
	if !ok {
		return 0, fmt.Errorf("unexpected ZCARD reply type: %T", value)
	}

	return count, nil
}
