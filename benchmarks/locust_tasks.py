"""
Load testing script for AI UI Generator using Locust.

This script simulates multiple concurrent users performing generation tasks.

Usage:
    # UI mode (interactive)
    locust -f benchmarks/locust_tasks.py --host=http://localhost:8081

    # Headless mode (automated)
    locust -f benchmarks/locust_tasks.py \
      --host=http://localhost:8081 \
      --users=10 \
      --spawn-rate=2 \
      --run-time=10m \
      --headless \
      --csv=benchmarks/results/load_test

Requirements:
    pip install locust
"""

from locust import HttpUser, task, between, events
from datetime import datetime
import json
import random
import logging

logger = logging.getLogger(__name__)


class GenerationTasks(HttpUser):
    """Simulates a user creating and managing generations."""

    # Wait 3-8 seconds between requests
    wait_time = between(3, 8)

    def on_start(self):
        """Called when a simulated user starts."""
        self.access_token = None
        self.generation_id = None
        self.session_id = None
        logger.info(f"User {self.client_pool.client.name} started")

    @task(10)
    def create_generation(self):
        """Create a new generation (70% of traffic)."""
        prompts = [
            "Create a modern landing page with hero section, features grid, pricing table, and CTA buttons. Use a blue color scheme.",
            "Build an admin dashboard with charts showing sales trends, user metrics, revenue graphs, and KPI cards.",
            "Design a mobile-first e-commerce product listing page with filters, search, and shopping cart preview.",
            "Create a SaaS pricing page with 3 tiers, comparison table, and testimonials section.",
            "Build a portfolio website with hero, project gallery, skills section, and contact form.",
        ]

        selected_prompt = random.choice(prompts)

        with self.client.post(
            '/api/generations/stream',
            data={'prompt': selected_prompt, 'domain': random.choice([None, 'saas', 'ecommerce'])},
            catch_response=True,
            timeout=1200
        ) as response:
            if response.status_code == 200:
                response.success()
                # Try to extract generation ID from response
                try:
                    self.generation_id = response.json().get('generationId')
                except:
                    pass
            else:
                response.failure(f"Got {response.status_code}")

    @task(3)
    def list_generations(self):
        """List user's projects (20% of traffic)."""
        with self.client.get('/api/generations', catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                try:
                    data = response.json()
                    if isinstance(data, list) and data:
                        self.generation_id = data[0].get('generationId')
                except:
                    pass
            else:
                response.failure(f"Got {response.status_code}")

    @task(2)
    def get_generation_details(self):
        """Get details of a specific generation (10% of traffic)."""
        if not self.generation_id:
            return  # Skip if we don't have a generation ID

        with self.client.get(
            f'/api/generations/{self.generation_id}',
            catch_response=True
        ) as response:
            if response.status_code in [200, 404]:  # 404 is expected for non-existent IDs
                response.success()
            else:
                response.failure(f"Got {response.status_code}")

    @task(1)
    def get_quality_scores(self):
        """Get quality scores for a generation."""
        if not self.generation_id:
            return

        with self.client.get(
            f'/api/generations/{self.generation_id}/quality',
            catch_response=True
        ) as response:
            if response.status_code in [200, 404]:
                response.success()
            else:
                response.failure(f"Got {response.status_code}")


class AdminUser(HttpUser):
    """Simulates an admin user accessing dashboard and metrics."""

    weight = 1  # 1 admin per 10 regular users
    wait_time = between(5, 15)

    @task
    def view_admin_stats(self):
        """GET /api/admin/stats — view system statistics."""
        with self.client.get('/api/admin/stats', catch_response=True) as response:
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"Got {response.status_code}")

    @task
    def view_admin_activity(self):
        """GET /api/admin/activity — view recent activity."""
        with self.client.get('/api/admin/activity', catch_response=True) as response:
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"Got {response.status_code}")


# Event handlers for reporting
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when the load test starts."""
    logger.info("🚀 Load test started")
    logger.info(f"   Target: {environment.host}")
    logger.info(f"   Users: {len(list(environment.runner.user_instances)) if environment.runner else '?'}")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when the load test completes."""
    logger.info("⏹️  Load test completed")

    # Print summary stats
    print("\n" + "=" * 70)
    print("📊 LOAD TEST SUMMARY")
    print("=" * 70)

    if environment.stats:
        for entry in environment.stats.entries.values():
            if entry.name:
                print(f"\n{entry.name}")
                print(f"  Requests:    {entry.num_requests}")
                print(f"  Failures:    {entry.num_failures} ({entry.failure_rate*100:.1f}%)")
                print(f"  Avg Time:    {entry.avg_response_time:.0f}ms")
                print(f"  Min Time:    {entry.min_response_time:.0f}ms")
                print(f"  Max Time:    {entry.max_response_time:.0f}ms")
                print(f"  Median Time: {entry.median_response_time:.0f}ms")
                if hasattr(entry, 'percentile_99'):
                    print(f"  p99 Time:    {entry.percentile_99:.0f}ms")

    print("=" * 70 + "\n")


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    """Called after each request (useful for custom logging)."""
    if exception:
        logger.warning(f"❌ {name}: {exception}")
    elif response_time > 5000:  # Log slow requests (> 5s)
        logger.warning(f"⚠️  Slow request: {name} took {response_time:.0f}ms")


# Test scenario definitions
if __name__ == "__main__":
    """
    Run with different scenarios:

    # Light load test (5 users, 2 min)
    locust -f benchmarks/locust_tasks.py \
      --host=http://localhost:8081 \
      --users=5 \
      --spawn-rate=1 \
      --run-time=2m

    # Medium load test (10 users, 5 min)
    locust -f benchmarks/locust_tasks.py \
      --host=http://localhost:8081 \
      --users=10 \
      --spawn-rate=2 \
      --run-time=5m

    # Heavy load test (20 users, 10 min)
    locust -f benchmarks/locust_tasks.py \
      --host=http://localhost:8081 \
      --users=20 \
      --spawn-rate=2 \
      --run-time=10m \
      --csv=benchmarks/results/heavy_load

    # Spike test (50 users instantly)
    locust -f benchmarks/locust_tasks.py \
      --host=http://localhost:8081 \
      --users=50 \
      --spawn-rate=50 \
      --run-time=5m
    """
    pass
