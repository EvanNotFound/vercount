#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

redis = None
RedisError = Exception
ResponseError = Exception


TTL_SECONDS = 60 * 60 * 24 * 30 * 3
DEFAULT_SCAN_COUNT = 1000
DEFAULT_BATCH_SIZE = 250

LEGACY_SITE_PREFIX = "uv:site:"
LEGACY_BASELINE_PREFIX = "uv:baseline:"
NEW_SITE_COUNT_PREFIX = "uv:site:count:"


def ensure_redis_available() -> None:
    global redis, RedisError, ResponseError

    if redis is not None:
        return

    try:
        import redis as redis_module
        from redis.exceptions import RedisError as redis_error_cls
        from redis.exceptions import ResponseError as response_error_cls
    except ImportError:  # pragma: no cover - exercised only when dependency is missing.
        print(
            "Missing dependency: redis. Install it with `python3 -m pip install redis`.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    redis = redis_module
    RedisError = redis_error_cls
    ResponseError = response_error_cls


@dataclass
class HostPlan:
    host: str
    legacy_site_key: str
    legacy_baseline_key: str
    new_site_count_key: str
    legacy_site_type: str = "none"
    legacy_site_count: int = 0
    legacy_baseline_value: int = 0
    legacy_baseline_exists: bool = False
    legacy_total: int | None = None
    new_exists: bool = False
    new_value: int | None = None
    action: str = "none"
    mismatch: bool = False
    issues: list[str] = field(default_factory=list)

    @property
    def has_legacy_keys(self) -> bool:
        return self.legacy_site_type != "none" or self.legacy_baseline_exists


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "One-off migration from legacy UV baseline/IP storage to uv:site:count:* . "
            "Defaults to dry-run; pass --execute to mutate Redis."
        )
    )
    parser.add_argument(
        "--redis-url",
        help="Direct Redis URL. Overrides REDIS_URL from apps/api/.env or repo-root .env.",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually write uv:site:count:* keys and delete legacy keys.",
    )
    parser.add_argument(
        "--scan-count",
        type=int,
        default=DEFAULT_SCAN_COUNT,
        help=f"SCAN count hint per round (default: {DEFAULT_SCAN_COUNT}).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Hosts inspected or written per batch (default: {DEFAULT_BATCH_SIZE}).",
    )
    parser.add_argument(
        "--delete-mode",
        choices=("unlink", "del"),
        default="unlink",
        help="How to remove legacy keys after migration (default: unlink).",
    )
    parser.add_argument(
        "--max-hosts",
        type=int,
        default=0,
        help="Optional safety limit for how many hosts to process.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print per-host decisions.",
    )
    return parser.parse_args()


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        if key and key not in os.environ:
            os.environ[key] = value


def iter_batches(items: list[str], batch_size: int) -> Iterable[list[str]]:
    for start in range(0, len(items), batch_size):
        yield items[start : start + batch_size]


def scan_hosts_for_prefix(
    client: redis.Redis,
    prefix: str,
    scan_count: int,
    exclude_prefix: str | None = None,
) -> set[str]:
    hosts: set[str] = set()
    cursor = 0

    while True:
        cursor, keys = client.scan(cursor=cursor, match=f"{prefix}*", count=scan_count)
        for key in keys:
            if exclude_prefix and key.startswith(exclude_prefix):
                continue
            if key.startswith(prefix):
                hosts.add(key[len(prefix) :])
        if cursor == 0:
            return hosts


def parse_int(raw_value: str | None, label: str, plan: HostPlan) -> int | None:
    if raw_value is None:
        return None

    try:
        return int(str(raw_value).strip())
    except (TypeError, ValueError):
        plan.issues.append(f"invalid {label} value: {raw_value!r}")
        return None


def is_unknown_command(result: object) -> bool:
    return (
        isinstance(result, ResponseError) and "unknown command" in str(result).lower()
    )


def plan_host_batch(client: redis.Redis, hosts: list[str]) -> list[HostPlan]:
    pipe = client.pipeline(transaction=False)
    plans: list[HostPlan] = []

    for host in hosts:
        plan = HostPlan(
            host=host,
            legacy_site_key=f"{LEGACY_SITE_PREFIX}{host}",
            legacy_baseline_key=f"{LEGACY_BASELINE_PREFIX}{host}",
            new_site_count_key=f"{NEW_SITE_COUNT_PREFIX}{host}",
        )
        plans.append(plan)
        pipe.type(plan.legacy_site_key)
        pipe.scard(plan.legacy_site_key)
        pipe.get(plan.legacy_baseline_key)
        pipe.exists(plan.new_site_count_key)
        pipe.get(plan.new_site_count_key)

    results = pipe.execute(raise_on_error=False)

    for index, plan in enumerate(plans):
        offset = index * 5
        site_type_result = results[offset]
        site_count_result = results[offset + 1]
        baseline_result = results[offset + 2]
        new_exists_result = results[offset + 3]
        new_value_result = results[offset + 4]

        if isinstance(site_type_result, ResponseError):
            plan.issues.append(
                f"failed to inspect legacy site key type: {site_type_result}"
            )
            plan.action = "skip"
            continue

        plan.legacy_site_type = str(site_type_result or "none")

        if plan.legacy_site_type == "set":
            if isinstance(site_count_result, ResponseError):
                plan.issues.append(
                    f"failed to count legacy site set: {site_count_result}"
                )
            else:
                plan.legacy_site_count = int(site_count_result or 0)
        elif plan.legacy_site_type == "none":
            plan.legacy_site_count = 0
        else:
            plan.issues.append(
                f"legacy site key has unexpected Redis type {plan.legacy_site_type!r}"
            )

        plan.legacy_baseline_exists = baseline_result is not None
        if plan.legacy_baseline_exists:
            baseline_value = parse_int(baseline_result, "legacy baseline", plan)
            if baseline_value is not None:
                plan.legacy_baseline_value = baseline_value

        plan.new_exists = bool(int(new_exists_result or 0))
        if plan.new_exists:
            new_value = parse_int(new_value_result, "new site count", plan)
            if new_value is not None:
                plan.new_value = new_value

        if plan.issues:
            plan.action = "skip"
            continue

        if plan.legacy_baseline_exists or plan.legacy_site_count > 0:
            plan.legacy_total = plan.legacy_site_count + plan.legacy_baseline_value

        if plan.new_exists:
            plan.action = "cleanup" if plan.has_legacy_keys else "none"
            if plan.legacy_total is not None and plan.new_value != plan.legacy_total:
                plan.mismatch = True
        elif plan.legacy_total is not None:
            plan.action = "migrate"
        elif plan.has_legacy_keys:
            # Empty legacy sets carry no usable UV total, but they are still stale data.
            plan.action = "cleanup"
        else:
            plan.action = "none"

    return plans


def print_plan(plan: HostPlan) -> None:
    summary = [
        f"host={plan.host}",
        f"action={plan.action}",
        f"legacy_total={plan.legacy_total}",
        f"new_exists={plan.new_exists}",
        f"new_value={plan.new_value}",
    ]
    if plan.mismatch:
        summary.append("mismatch=true")
    if plan.issues:
        summary.append(f"issues={'; '.join(plan.issues)}")
    print(" | ".join(summary))


def migrate_missing_new_keys(
    client: redis.Redis,
    plans: list[HostPlan],
    batch_size: int,
    verbose: bool,
) -> tuple[list[HostPlan], int, int]:
    migrated: list[HostPlan] = []
    migrated_count = 0
    race_count = 0
    migrate_plans = [plan for plan in plans if plan.action == "migrate"]

    for batch in iter_batches([plan.host for plan in migrate_plans], batch_size):
        host_to_plan = {plan.host: plan for plan in migrate_plans if plan.host in batch}
        pipe = client.pipeline(transaction=False)

        for host in batch:
            plan = host_to_plan[host]
            pipe.set(
                plan.new_site_count_key, plan.legacy_total, ex=TTL_SECONDS, nx=True
            )

        results = pipe.execute(raise_on_error=False)

        for host, result in zip(batch, results):
            plan = host_to_plan[host]
            if isinstance(result, ResponseError):
                plan.issues.append(f"failed to write new site count: {result}")
                plan.action = "skip"
                continue

            if result:
                migrated_count += 1
                migrated.append(plan)
                if verbose:
                    print(
                        f"migrated host={plan.host} value={plan.legacy_total} key={plan.new_site_count_key}"
                    )
                continue

            # Another writer created the new key between inspection and migration.
            race_count += 1
            current_exists = bool(client.exists(plan.new_site_count_key))
            if current_exists:
                current_value = parse_int(
                    client.get(plan.new_site_count_key),
                    "new site count after race",
                    plan,
                )
                plan.new_exists = True
                plan.new_value = current_value
                plan.action = "cleanup"
                if plan.legacy_total is not None and current_value != plan.legacy_total:
                    plan.mismatch = True
                migrated.append(plan)
                if verbose:
                    print(
                        f"race host={plan.host} new_key_already_exists value={current_value}"
                    )
            else:
                plan.issues.append(
                    "SET NX returned no result and the new site count key still does not exist"
                )
                plan.action = "skip"

    return migrated, migrated_count, race_count


def cleanup_legacy_keys(
    client: redis.Redis,
    plans: list[HostPlan],
    batch_size: int,
    delete_mode: str,
    verbose: bool,
) -> tuple[int, int, str]:
    cleanup_plans = [plan for plan in plans if plan.action == "cleanup"]
    cleaned_hosts = 0
    deleted_key_count = 0
    command = delete_mode

    host_batches = list(iter_batches([plan.host for plan in cleanup_plans], batch_size))
    if not host_batches:
        return cleaned_hosts, deleted_key_count, command

    plan_lookup = {plan.host: plan for plan in cleanup_plans}
    batch_index = 0
    while batch_index < len(host_batches):
        batch_hosts = host_batches[batch_index]
        pipe = client.pipeline(transaction=False)
        for host in batch_hosts:
            plan = plan_lookup[host]
            if command == "unlink":
                pipe.unlink(plan.legacy_site_key, plan.legacy_baseline_key)
            else:
                pipe.delete(plan.legacy_site_key, plan.legacy_baseline_key)

        results = pipe.execute(raise_on_error=False)
        if command == "unlink" and any(
            is_unknown_command(result) for result in results
        ):
            print("UNLINK is unavailable on this Redis server, falling back to DEL.")
            command = "del"
            continue

        for host, result in zip(batch_hosts, results):
            plan = plan_lookup[host]
            if isinstance(result, ResponseError):
                plan.issues.append(f"failed to delete legacy keys: {result}")
                continue
            cleaned_hosts += 1
            deleted_key_count += int(result or 0)
            if verbose:
                print(
                    f"cleaned host={plan.host} deleted={int(result or 0)} mode={command}"
                )
        batch_index += 1

    return cleaned_hosts, deleted_key_count, command


def main() -> int:
    args = parse_args()
    ensure_redis_available()
    repo_root = Path(__file__).resolve().parents[1]

    load_env_file(repo_root / "apps" / "api" / ".env")
    load_env_file(repo_root / ".env")

    redis_url = args.redis_url or os.getenv("REDIS_URL", "").strip()
    if not redis_url:
        print(
            "REDIS_URL is required. Pass --redis-url or set it in apps/api/.env or .env.",
            file=sys.stderr,
        )
        return 1

    try:
        client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5,
            health_check_interval=30,
        )
        client.ping()
    except RedisError as error:
        print(f"Failed to connect to Redis: {error}", file=sys.stderr)
        return 1

    start_time = time.time()
    print(f"Connected to Redis using {redis_url}")
    if not args.execute:
        print("Running in dry-run mode. Pass --execute to write changes.")

    legacy_site_hosts = scan_hosts_for_prefix(
        client,
        LEGACY_SITE_PREFIX,
        args.scan_count,
        exclude_prefix=NEW_SITE_COUNT_PREFIX,
    )
    legacy_baseline_hosts = scan_hosts_for_prefix(
        client,
        LEGACY_BASELINE_PREFIX,
        args.scan_count,
    )

    hosts = sorted(legacy_site_hosts | legacy_baseline_hosts)
    if args.max_hosts > 0:
        hosts = hosts[: args.max_hosts]

    print(
        "Discovered "
        f"{len(legacy_site_hosts)} legacy site hosts, "
        f"{len(legacy_baseline_hosts)} baseline hosts, "
        f"{len(hosts)} unique hosts to inspect."
    )

    plans: list[HostPlan] = []
    for batch in iter_batches(hosts, args.batch_size):
        batch_plans = plan_host_batch(client, batch)
        plans.extend(batch_plans)
        if args.verbose:
            for plan in batch_plans:
                print_plan(plan)

    invalid_count = sum(1 for plan in plans if plan.issues)
    mismatch_count = sum(1 for plan in plans if plan.mismatch)
    migrate_count = sum(1 for plan in plans if plan.action == "migrate")
    cleanup_count = sum(1 for plan in plans if plan.action == "cleanup")
    no_op_count = sum(1 for plan in plans if plan.action == "none")

    print(
        "Planned actions: "
        f"migrate={migrate_count}, cleanup={cleanup_count}, none={no_op_count}, "
        f"issues={invalid_count}, mismatches={mismatch_count}"
    )

    migrated_count = 0
    race_count = 0
    cleaned_hosts = 0
    deleted_key_count = 0
    delete_mode_used = args.delete_mode

    if args.execute:
        _, migrated_count, race_count = migrate_missing_new_keys(
            client,
            plans,
            args.batch_size,
            args.verbose,
        )
        cleaned_hosts, deleted_key_count, delete_mode_used = cleanup_legacy_keys(
            client,
            plans,
            args.batch_size,
            args.delete_mode,
            args.verbose,
        )

    elapsed = time.time() - start_time
    print("=" * 72)
    print("LEGACY UV MIGRATION SUMMARY")
    print("=" * 72)
    print(f"Hosts inspected: {len(plans)}")
    print(f"Hosts requiring migration: {migrate_count}")
    print(f"Hosts requiring cleanup: {cleanup_count}")
    print(f"Hosts with mismatched new vs legacy values: {mismatch_count}")
    print(f"Hosts with issues: {invalid_count}")
    print(f"Execution mode: {'execute' if args.execute else 'dry-run'}")
    if args.execute:
        print(f"Migrated hosts: {migrated_count}")
        print(f"Race-resolved hosts: {race_count}")
        print(f"Cleaned hosts: {cleaned_hosts}")
        print(f"Deleted legacy keys: {deleted_key_count}")
        print(f"Delete mode used: {delete_mode_used}")
    print(f"Elapsed: {elapsed:.1f}s")

    problematic_plans = [plan for plan in plans if plan.issues or plan.mismatch]
    if problematic_plans:
        print("\nDetailed findings:")
        for plan in problematic_plans:
            print_plan(plan)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
