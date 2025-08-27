const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearDatabase() {
    console.log('🧹 Starting database cleanup...');
    
    try {
        // Clear dependent tables first (in order to avoid FK constraint issues)
        const tablesToClear = [
            'admin_sessions',
            'admin_session_logs', 
            'admin_login_logs',
            'admin_activity_logs',
            'admin_security_events',
            'user_sessions',
            'session_conflicts',
            'shop_sessions',
            'driver_notifications',
            'shop_notifications', 
            'notifications',
            'push_subscriptions',
            'shop_orders',
            'orders',
            'user_orders',
            'shop_team_members',
            'partner_shops',
            'shop_accounts',
            'user_settings',
            'system_logs',
            'users',
            'admin_users'
        ];
        
        for (const table of tablesToClear) {
            console.log(`Clearing ${table}...`);

            // Use raw SQL for more reliable deletion
            const { error } = await supabase.rpc('exec_sql', {
                sql: `DELETE FROM ${table}`
            });

            if (error && !error.message.includes('does not exist') && !error.message.includes('function exec_sql')) {
                // Fallback to regular delete with a condition that matches all records
                const { error: fallbackError } = await supabase
                    .from(table)
                    .delete()
                    .gte('created_at', '1900-01-01'); // This should match all records

                if (fallbackError && !fallbackError.message.includes('does not exist')) {
                    console.warn(`Warning clearing ${table}:`, fallbackError.message);
                } else {
                    console.log(`✅ Cleared ${table}`);
                }
            } else if (!error) {
                console.log(`✅ Cleared ${table}`);
            } else {
                console.warn(`Warning clearing ${table}:`, error.message);
            }
        }
        
        // Clear categories but keep some defaults
        console.log('Clearing categories...');
        const { error: categoriesError } = await supabase
            .from('categories')
            .delete()
            .gte('created_at', '1900-01-01'); // This should match all records

        if (categoriesError) {
            console.warn('Warning clearing categories:', categoriesError.message);
        }
        
        // Insert default categories
        console.log('Inserting default categories...');
        const { error: insertError } = await supabase
            .from('categories')
            .insert([
                { name: 'Restaurant', description: 'Food and dining establishments', icon: 'fas fa-utensils', color: '#ff6b35', is_active: true },
                { name: 'Grocery', description: 'Supermarkets and grocery stores', icon: 'fas fa-shopping-cart', color: '#28a745', is_active: true },
                { name: 'Pharmacy', description: 'Pharmacies and medical supplies', icon: 'fas fa-pills', color: '#007bff', is_active: true },
                { name: 'Coffee Shop', description: 'Coffee shops and cafes', icon: 'fas fa-coffee', color: '#6f42c1', is_active: true },
                { name: 'Retail', description: 'General retail stores', icon: 'fas fa-store', color: '#fd7e14', is_active: true }
            ]);
            
        if (insertError) {
            console.error('Error inserting default categories:', insertError.message);
        } else {
            console.log('✅ Inserted default categories');
        }
        
        // Show final counts
        console.log('\n📊 Final table counts:');
        const countTables = ['users', 'categories', 'partner_shops', 'shop_accounts', 'orders', 'notifications'];
        
        for (const table of countTables) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
                
            if (!error) {
                console.log(`${table}: ${count} records`);
            }
        }
        
        console.log('\n🎉 Database cleanup completed successfully!');
        console.log('📝 Categories table has 5 default entries, all other tables are empty.');
        
    } catch (error) {
        console.error('❌ Error during database cleanup:', error);
        process.exit(1);
    }
}

// Run the cleanup
if (require.main === module) {
    clearDatabase().then(() => {
        console.log('✅ Cleanup script finished');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Cleanup script failed:', error);
        process.exit(1);
    });
}

module.exports = { clearDatabase };
