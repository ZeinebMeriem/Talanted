#!/usr/bin/env python3
"""
Collect baseline performance metrics from MongoDB.

Usage:
    python benchmarks/collect_baseline.py
    python benchmarks/collect_baseline.py --days=7
    python benchmarks/collect_baseline.py --output=baseline_2026-05-11.json
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any
import statistics

try:
    from pymongo import MongoClient
except ImportError:
    print("❌ pymongo not installed. Run: pip install pymongo")
    sys.exit(1)


def connect_mongodb(host: str = 'localhost', port: int = 27017) -> tuple:
    """Connect to MongoDB and return client + db."""
    try:
        client = MongoClient(f'mongodb://{host}:{port}/', serverSelectionTimeoutMS=5000)
        # Verify connection
        client.admin.command('ping')
        db = client['ai-ui-generator']
        print(f"✅ Connected to MongoDB at {host}:{port}")
        return client, db
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        sys.exit(1)


def get_duration_stats(values: List[int]) -> Dict[str, float]:
    """Calculate statistics for a list of durations."""
    if not values:
        return {}

    sorted_vals = sorted(values)
    return {
        'count': len(values),
        'min_ms': min(values),
        'max_ms': max(values),
        'mean_ms': round(statistics.mean(values), 1),
        'median_ms': round(statistics.median(values), 1),
        'p95_ms': round(sorted_vals[int(len(values) * 0.95)], 1) if len(values) > 1 else 0,
        'p99_ms': round(sorted_vals[int(len(values) * 0.99)], 1) if len(values) > 1 else 0,
    }


def collect_generation_metrics(db, days: int = 7) -> Dict[str, Any]:
    """Collect metrics from ai_reports collection."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Get all reports with durations and scores
    reports = list(db.ai_reports.find(
        {'durations': {'$exists': True}, 'createdAt': {'$gte': cutoff_date}},
        {'durations': 1, 'score': 1, 'retries_count': 1, 'build_retries': 1,
         'ui_evaluation': 1, 'llm_provider': 1, 'createdAt': 1}
    ).sort('createdAt', -1))

    if not reports:
        print(f"⚠️  No reports with durations found in last {days} day(s)")
        return {}

    print(f"✅ Found {len(reports)} reports with durations")

    # Extract individual stage durations
    stages = ['extract_ms', 'prep_ms', 'plan_ms', 'design_ms', 'codegen_ms', 'build_ms', 'eval_ms']
    stage_durations: Dict[str, List[int]] = {stage: [] for stage in stages}

    for report in reports:
        durations = report.get('durations', {})
        for stage in stages:
            if stage in durations and isinstance(durations[stage], (int, float)):
                stage_durations[stage].append(int(durations[stage]))

    # Calculate end-to-end latencies
    end_to_end_durations = []
    for report in reports:
        total = sum(report.get('durations', {}).values() if isinstance(report.get('durations'), dict) else [])
        if total > 0:
            end_to_end_durations.append(int(total))

    # Quality scores
    quality_scores = [r['score'] for r in reports if 'score' in r and r['score']]

    # Retry stats
    retry_counts = [r.get('retries_count', 0) for r in reports]
    build_retries = [r.get('build_retries', 0) for r in reports]

    # Provider distribution
    provider_counts: Dict[str, int] = {}
    for report in reports:
        provider = report.get('llm_provider', 'unknown')
        provider_counts[provider] = provider_counts.get(provider, 0) + 1

    # Build success rate
    ui_evals = [r.get('ui_evaluation', {}) for r in reports]
    success_rate = 1.0 - (sum(build_retries) / len(reports)) if reports else 0

    return {
        'collection_date': datetime.utcnow().isoformat(),
        'period_days': days,
        'sample_size': len(reports),
        'stages': {stage: get_duration_stats(stage_durations[stage]) for stage in stages},
        'end_to_end': get_duration_stats(end_to_end_durations),
        'quality': {
            'avg_score': round(statistics.mean(quality_scores), 1) if quality_scores else 0,
            'median_score': round(statistics.median(quality_scores), 1) if quality_scores else 0,
            'p95_score': round(sorted(quality_scores)[int(len(quality_scores)*0.95)], 1) if len(quality_scores) > 1 else 0,
        },
        'retries': {
            'avg_llm_retries': round(statistics.mean(retry_counts), 2),
            'avg_build_retries': round(statistics.mean(build_retries), 2),
            'build_success_rate': round(success_rate, 4),
        },
        'provider_distribution': provider_counts,
    }


def collect_database_metrics(db) -> Dict[str, Any]:
    """Collect MongoDB collection statistics."""
    collections = {
        'generations': db.generations,
        'ai_reports': db.ai_reports,
        'audit_events': db.audit_events,
        'accessibility_audits': db.accessibility_audits,
    }

    db_metrics = {}
    for name, collection in collections.items():
        try:
            stats = db.command('collStats', name)
            db_metrics[name] = {
                'document_count': stats['count'],
                'size_bytes': stats['size'],
                'avg_doc_size_bytes': round(stats['size'] / stats['count']) if stats['count'] > 0 else 0,
                'index_count': len(db[name].list_indexes()),
            }
        except Exception as e:
            db_metrics[name] = {'error': str(e)}

    return db_metrics


def collect_audit_events(db, days: int = 7) -> Dict[str, Any]:
    """Collect audit event statistics."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    events = list(db.audit_events.find(
        {'timestamp': {'$gte': cutoff_date}},
        {'type': 1, 'durationMs': 1}
    ))

    if not events:
        return {'total_events': 0}

    # Group by type
    by_type: Dict[str, List[int]] = {}
    for event in events:
        event_type = event.get('type', 'unknown')
        duration = event.get('durationMs', 0)
        if event_type not in by_type:
            by_type[event_type] = []
        if duration:
            by_type[event_type].append(duration)

    # Calculate stats per type
    audit_stats = {}
    for event_type, durations in by_type.items():
        audit_stats[event_type] = get_duration_stats(durations)

    return {
        'total_events': len(events),
        'period_days': days,
        'by_type': audit_stats,
    }


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description='Collect benchmarking baselines from MongoDB')
    parser.add_argument('--days', type=int, default=7, help='Number of days to look back (default: 7)')
    parser.add_argument('--host', default='localhost', help='MongoDB host (default: localhost)')
    parser.add_argument('--port', type=int, default=27017, help='MongoDB port (default: 27017)')
    parser.add_argument('--output', help='Output JSON file (default: benchmarks/baseline_<date>.json)')

    args = parser.parse_args()

    # Connect to MongoDB
    client, db = connect_mongodb(args.host, args.port)

    try:
        # Collect metrics
        print(f"\n📊 Collecting benchmarks from last {args.days} day(s)...\n")

        metrics = {
            'metadata': {
                'timestamp': datetime.utcnow().isoformat(),
                'days_lookback': args.days,
                'mongodb_host': args.host,
                'mongodb_port': args.port,
            },
            'generations': collect_generation_metrics(db, args.days),
            'database': collect_database_metrics(db),
            'audit_events': collect_audit_events(db, args.days),
        }

        # Determine output file
        output_file = args.output or f"benchmarks/baseline_{datetime.now().strftime('%Y-%m-%d_%H%M%S')}.json"

        # Write JSON
        with open(output_file, 'w') as f:
            json.dump(metrics, f, indent=2)

        print(f"✅ Baseline saved to: {output_file}\n")

        # Print summary
        print("📈 SUMMARY:")
        print("=" * 60)
        if 'generations' in metrics and metrics['generations']:
            gen = metrics['generations']
            print(f"  End-to-End Latency (p95): {gen['end_to_end'].get('p95_ms', 'N/A')} ms")
            print(f"  Avg Quality Score: {gen['quality'].get('avg_score', 'N/A')}")
            print(f"  Build Success Rate: {gen['retries'].get('build_success_rate', 'N/A')}")
            if 'stage' in str(gen):
                print(f"\n  Pipeline Stages:")
                for stage, stats in gen.get('stages', {}).items():
                    if stats:
                        print(f"    {stage}: {stats.get('mean_ms', 0):.0f}ms (p95: {stats.get('p95_ms', 0):.0f}ms)")
        print("=" * 60)

    finally:
        client.close()

    return 0


if __name__ == '__main__':
    sys.exit(main())
