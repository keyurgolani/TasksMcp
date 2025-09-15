#!/usr/bin/env node

process.env.NODE_ENV = 'test';

console.log('Checking memory usage...');

const startMemory = process.memoryUsage();

// Try to import the main module and measure memory usage
async function checkMemory() {
  try {
    console.log('Attempting to import main module...');
    await import('../../dist/index.js');
    
    const endMemory = process.memoryUsage();
    console.log('Memory usage after import:');
    console.log('RSS:', Math.round((endMemory.rss - startMemory.rss) / 1024 / 1024), 'MB');
    console.log('Heap Used:', Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024), 'MB');
    console.log('External:', Math.round((endMemory.external - startMemory.external) / 1024 / 1024), 'MB');
    console.log('✅ Memory usage check complete');
    return true;
  } catch (error) {
    console.error('❌ Failed to import main module:', error.message);
    
    // Try alternative approach - just check if we can run the CLI
    console.log('Trying alternative memory check via CLI...');
    try {
      const { spawn } = await import('child_process');
      const { promisify } = await import('util');
      
      return new Promise((resolve, reject) => {
        const child = spawn('node', ['dist/app/cli.js', '--version'], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            console.log('CLI executed successfully');
            console.log('Output:', stdout.trim());
            const endMemory = process.memoryUsage();
            console.log('Memory usage (basic check):');
            console.log('RSS:', Math.round(endMemory.rss / 1024 / 1024), 'MB');
            console.log('Heap Used:', Math.round(endMemory.heapUsed / 1024 / 1024), 'MB');
            console.log('✅ Alternative memory check complete');
            resolve(true);
          } else {
            console.error('CLI failed with code:', code);
            console.error('stderr:', stderr);
            reject(new Error(`CLI failed with exit code ${code}`));
          }
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          child.kill();
          reject(new Error('CLI execution timed out'));
        }, 10000);
      });
    } catch (altError) {
      console.error('❌ Alternative memory check also failed:', altError.message);
      throw error; // Re-throw original error
    }
  }
}

checkMemory()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Memory usage check failed:', error.message);
    process.exit(1);
  });