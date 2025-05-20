import { storage } from './storage';

/**
 * Debug utility for authentication issues
 */
export async function checkAuth() {
  try {
    console.log('\n==== Auth Debug Info ====');
    const users = await storage.getAllUsers();
    console.log(`Total Users: ${users.length}`);
    
    if (users.length > 0) {
      console.log('User details:');
      users.forEach(user => {
        console.log(`ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
      });
      
      // Try to authenticate with each user
      console.log('\nTesting authentication lookup:');
      for (const testUser of ['client1', 'provider1', 'admin', 'supplier1']) {
        const user = await storage.getUserByUsername(testUser);
        console.log(`Username "${testUser}" lookup result:`, user ? `✓ Found (ID: ${user.id})` : '❌ Not found');
      }
    } else {
      console.log('No users found in storage!');
    }
    console.log('========================\n');
  } catch (error) {
    console.error('Error during auth check:', error);
  }
}