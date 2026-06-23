#!/bin/bash

# Migrate all "dev-user" projects to the new Keycloak user ID
NEW_USER_ID="a1731f56-173f-4adb-887e-21903bfb9d23"
DB_NAME="ai_ui_generator"
COLLECTION="generations"

echo "🔄 Starting migration of dev-user projects..."
echo "   Old user: dev-user"
echo "   New user: $NEW_USER_ID"
echo ""

# Connect to MongoDB and run update
mongosh --host localhost:27017 \
  --quiet \
  --eval "
    const db = db.getSiblingDB('$DB_NAME');

    // Count projects before migration
    const beforeCount = db.$COLLECTION.countDocuments({ userId: 'dev-user' });
    console.log('📊 Projects with userId=dev-user: ' + beforeCount);

    if (beforeCount === 0) {
      console.log('✅ No projects to migrate - already done!');
      process.exit(0);
    }

    // Update all dev-user projects
    const result = db.$COLLECTION.updateMany(
      { userId: 'dev-user' },
      { \$set: { userId: '$NEW_USER_ID' } }
    );

    console.log('✅ Migration complete!');
    console.log('   Matched: ' + result.matchedCount);
    console.log('   Modified: ' + result.modifiedCount);

    // Verify
    const afterCount = db.$COLLECTION.countDocuments({ userId: 'dev-user' });
    const newCount = db.$COLLECTION.countDocuments({ userId: '$NEW_USER_ID' });
    console.log('');
    console.log('📊 Final counts:');
    console.log('   dev-user projects: ' + afterCount);
    console.log('   Your projects: ' + newCount);
  "

echo ""
echo "✨ Migration finished! Refresh your app to see all projects."
