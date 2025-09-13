#!/usr/bin/env node

/**
 * TestBro Database Migration Runner
 * Manages database schema changes with rollback support
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration directories
const migrationsDir = path.join(__dirname, '..', 'migrations');
const seedsDir = path.join(__dirname, '..', 'seeds');

// Ensure directories exist
[migrationsDir, seedsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Create migrations tracking table
 */
async function createMigrationsTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        execution_time_ms INTEGER,
        checksum VARCHAR(255)
      );
      
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
    `
  });

  if (error) {
    console.error('❌ Failed to create migrations table:', error);
    throw error;
  }
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations() {
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('version, name, executed_at')
    .order('version', { ascending: true });

  if (error && error.code !== 'PGRST116') { // Table doesn't exist
    console.error('❌ Failed to fetch executed migrations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get list of available migration files
 */
function getAvailableMigrations() {
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .filter(file => /^\d{3}_/.test(file)) // Must start with 3 digits
    .sort();

  return files.map(file => {
    const version = file.substring(0, 3);
    const name = file.substring(4, file.length - 4);
    const filePath = path.join(migrationsDir, file);
    
    return {
      version,
      name,
      filename: file,
      filePath
    };
  });
}

/**
 * Calculate file checksum
 */
function calculateChecksum(filePath) {
  const crypto = require('crypto');
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Execute a single migration
 */
async function executeMigration(migration) {
  const content = fs.readFileSync(migration.filePath, 'utf8');
  const checksum = calculateChecksum(migration.filePath);
  
  // Split content by migration sections
  const sections = content.split('-- ROLLBACK --');
  const upSQL = sections[0].trim();
  const downSQL = sections[1] ? sections[1].trim() : null;

  console.log(`📝 Executing migration ${migration.version}_${migration.name}`);
  
  const startTime = Date.now();
  
  try {
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: upSQL });
    
    if (error) {
      console.error(`❌ Migration ${migration.version} failed:`, error);
      throw error;
    }

    const executionTime = Date.now() - startTime;

    // Record successful migration
    const { error: recordError } = await supabase
      .from('schema_migrations')
      .upsert({
        version: migration.version,
        name: migration.name,
        executed_at: new Date().toISOString(),
        execution_time_ms: executionTime,
        checksum
      });

    if (recordError) {
      console.error(`❌ Failed to record migration ${migration.version}:`, recordError);
      throw recordError;
    }

    console.log(`✅ Migration ${migration.version}_${migration.name} completed in ${executionTime}ms`);
    return true;
    
  } catch (error) {
    console.error(`❌ Migration ${migration.version}_${migration.name} failed:`, error);
    throw error;
  }
}

/**
 * Rollback a single migration
 */
async function rollbackMigration(migration) {
  const content = fs.readFileSync(migration.filePath, 'utf8');
  const sections = content.split('-- ROLLBACK --');
  const downSQL = sections[1] ? sections[1].trim() : null;

  if (!downSQL) {
    console.error(`❌ No rollback SQL found for migration ${migration.version}_${migration.name}`);
    return false;
  }

  console.log(`📝 Rolling back migration ${migration.version}_${migration.name}`);
  
  try {
    // Execute rollback
    const { error } = await supabase.rpc('exec_sql', { sql: downSQL });
    
    if (error) {
      console.error(`❌ Rollback ${migration.version} failed:`, error);
      throw error;
    }

    // Remove migration record
    const { error: deleteError } = await supabase
      .from('schema_migrations')
      .delete()
      .eq('version', migration.version);

    if (deleteError) {
      console.error(`❌ Failed to remove migration record ${migration.version}:`, deleteError);
      throw deleteError;
    }

    console.log(`✅ Migration ${migration.version}_${migration.name} rolled back successfully`);
    return true;
    
  } catch (error) {
    console.error(`❌ Rollback ${migration.version}_${migration.name} failed:`, error);
    throw error;
  }
}

/**
 * Run pending migrations
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  await createMigrationsTable();
  
  const executedMigrations = await getExecutedMigrations();
  const availableMigrations = getAvailableMigrations();
  
  const executedVersions = new Set(executedMigrations.map(m => m.version));
  const pendingMigrations = availableMigrations.filter(m => !executedVersions.has(m.version));

  if (pendingMigrations.length === 0) {
    console.log('✅ No pending migrations found.');
    return;
  }

  console.log(`📋 Found ${pendingMigrations.length} pending migrations:`);
  pendingMigrations.forEach(m => {
    console.log(`  - ${m.version}_${m.name}`);
  });

  let successCount = 0;
  for (const migration of pendingMigrations) {
    try {
      await executeMigration(migration);
      successCount++;
    } catch (error) {
      console.error(`❌ Migration failed at ${migration.version}_${migration.name}`);
      break;
    }
  }

  console.log(`\n✅ Successfully executed ${successCount}/${pendingMigrations.length} migrations.`);
}

/**
 * Rollback migrations
 */
async function rollbackMigrations(steps = 1) {
  console.log(`🔄 Rolling back ${steps} migration(s)...`);
  
  const executedMigrations = await getExecutedMigrations();
  const availableMigrations = getAvailableMigrations();
  
  // Get migrations to rollback (latest first)
  const migrationsToRollback = executedMigrations
    .sort((a, b) => b.version.localeCompare(a.version))
    .slice(0, steps);

  if (migrationsToRollback.length === 0) {
    console.log('✅ No migrations to rollback.');
    return;
  }

  console.log(`📋 Rolling back ${migrationsToRollback.length} migrations:`);
  migrationsToRollback.forEach(m => {
    console.log(`  - ${m.version}_${m.name}`);
  });

  let successCount = 0;
  for (const executedMigration of migrationsToRollback) {
    // Find the migration file
    const migration = availableMigrations.find(m => m.version === executedMigration.version);
    
    if (!migration) {
      console.error(`❌ Migration file not found for version ${executedMigration.version}`);
      continue;
    }

    try {
      await rollbackMigration(migration);
      successCount++;
    } catch (error) {
      console.error(`❌ Rollback failed at ${migration.version}_${migration.name}`);
      break;
    }
  }

  console.log(`\n✅ Successfully rolled back ${successCount}/${migrationsToRollback.length} migrations.`);
}

/**
 * Show migration status
 */
async function showStatus() {
  await createMigrationsTable();
  
  const executedMigrations = await getExecutedMigrations();
  const availableMigrations = getAvailableMigrations();
  
  console.log('\n📊 Migration Status:');
  console.log('===================');
  
  const executedVersions = new Set(executedMigrations.map(m => m.version));
  
  availableMigrations.forEach(migration => {
    const isExecuted = executedVersions.has(migration.version);
    const status = isExecuted ? '✅ Executed' : '⏳ Pending';
    const executedInfo = isExecuted ? 
      executedMigrations.find(m => m.version === migration.version) : null;
    
    console.log(`${status} ${migration.version}_${migration.name}`);
    if (executedInfo) {
      console.log(`    Executed: ${new Date(executedInfo.executed_at).toLocaleString()}`);
    }
  });
  
  const pendingCount = availableMigrations.length - executedMigrations.length;
  console.log(`\n📈 Summary: ${executedMigrations.length} executed, ${pendingCount} pending`);
}

/**
 * Run seed files
 */
async function runSeeds() {
  console.log('🌱 Running seed files...');
  
  const seedFiles = fs.readdirSync(seedsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (seedFiles.length === 0) {
    console.log('✅ No seed files found.');
    return;
  }

  console.log(`📋 Found ${seedFiles.length} seed files:`);
  seedFiles.forEach(file => {
    console.log(`  - ${file}`);
  });

  let successCount = 0;
  for (const seedFile of seedFiles) {
    const filePath = path.join(seedsDir, seedFile);
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`📝 Executing seed: ${seedFile}`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: content });
      
      if (error) {
        console.error(`❌ Seed ${seedFile} failed:`, error);
        continue;
      }
      
      console.log(`✅ Seed ${seedFile} completed`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Seed ${seedFile} failed:`, error);
    }
  }

  console.log(`\n✅ Successfully executed ${successCount}/${seedFiles.length} seed files.`);
}

/**
 * Create new migration file
 */
function createMigration(name) {
  if (!name) {
    console.error('❌ Migration name is required');
    process.exit(1);
  }

  const availableMigrations = getAvailableMigrations();
  const lastVersion = availableMigrations.length > 0 ? 
    parseInt(availableMigrations[availableMigrations.length - 1].version) : 0;
  
  const newVersion = String(lastVersion + 1).padStart(3, '0');
  const fileName = `${newVersion}_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.sql`;
  const filePath = path.join(migrationsDir, fileName);
  
  const template = `-- Migration: ${name}
-- Version: ${newVersion}
-- Created: ${new Date().toISOString()}

-- Add your migration SQL here

-- Example:
-- CREATE TABLE example_table (
--     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--     name TEXT NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- ROLLBACK --
-- Add your rollback SQL here

-- Example:
-- DROP TABLE IF EXISTS example_table;
`;

  fs.writeFileSync(filePath, template);
  console.log(`✅ Created migration: ${fileName}`);
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'up':
      case 'migrate':
        await runMigrations();
        break;
      
      case 'down':
      case 'rollback':
        const steps = parseInt(arg) || 1;
        await rollbackMigrations(steps);
        break;
      
      case 'status':
        await showStatus();
        break;
      
      case 'seed':
        await runSeeds();
        break;
      
      case 'create':
        createMigration(arg);
        break;
      
      case 'reset':
        console.log('🔄 Resetting database...');
        await rollbackMigrations(1000); // Rollback all
        await runMigrations();
        await runSeeds();
        break;
      
      default:
        console.log(`
TestBro Migration Tool

Usage:
  npm run migrate up           - Run pending migrations
  npm run migrate down [n]     - Rollback n migrations (default: 1)
  npm run migrate status       - Show migration status
  npm run migrate seed         - Run seed files
  npm run migrate create <name> - Create new migration
  npm run migrate reset        - Reset database (rollback all + migrate + seed)

Examples:
  npm run migrate up
  npm run migrate down 2
  npm run migrate create add_user_preferences
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runMigrations,
  rollbackMigrations,
  showStatus,
  runSeeds,
  createMigration
};
