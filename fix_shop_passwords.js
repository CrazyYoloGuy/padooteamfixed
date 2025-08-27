const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixShopPasswords() {
    console.log('🔧 Fixing shop account passwords...');
    
    try {
        // Get all shop accounts
        const { data: shops, error } = await supabase
            .from('shop_accounts')
            .select('*');
            
        if (error) {
            throw error;
        }
        
        console.log(`Found ${shops.length} shop accounts to fix`);
        
        for (const shop of shops) {
            console.log(`\nProcessing shop: ${shop.email}`);
            console.log(`Current password: ${shop.password}`);
            
            // Check if password is already hashed (bcrypt hashes start with $2b$)
            if (shop.password.startsWith('$2b$')) {
                console.log('✅ Password already hashed, skipping');
                continue;
            }
            
            // Hash the plain text password
            const hashedPassword = await bcrypt.hash(shop.password, 10);
            console.log(`New hashed password: ${hashedPassword.substring(0, 20)}...`);
            
            // Update the shop account with hashed password
            const { error: updateError } = await supabase
                .from('shop_accounts')
                .update({ password: hashedPassword })
                .eq('id', shop.id);
                
            if (updateError) {
                console.error(`❌ Failed to update shop ${shop.email}:`, updateError.message);
            } else {
                console.log(`✅ Updated password for shop ${shop.email}`);
            }
        }
        
        console.log('\n🎉 Password fixing completed!');
        
        // Test login for each shop
        console.log('\n🧪 Testing logins...');
        for (const shop of shops) {
            if (shop.password.startsWith('$2b$')) {
                console.log(`Skipping test for ${shop.email} (already hashed)`);
                continue;
            }
            
            console.log(`Testing login for ${shop.email} with password: ${shop.password}`);
            
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: shop.email,
                    password: shop.password, // Use original plain text password
                    loginType: 'shop'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Login test successful for ${shop.email}`);
            } else {
                console.log(`❌ Login test failed for ${shop.email}: ${result.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error fixing shop passwords:', error);
        process.exit(1);
    }
}

// Run the fix
if (require.main === module) {
    fixShopPasswords().then(() => {
        console.log('✅ Password fix script finished');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Password fix script failed:', error);
        process.exit(1);
    });
}

module.exports = { fixShopPasswords };
