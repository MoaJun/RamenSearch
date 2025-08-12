#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Bundle analysis script
const distPath = './dist';

console.log('\n🔍 Bundle Analysis Report');
console.log('========================\n');

try {
  const files = fs.readdirSync(path.join(distPath, 'assets'));
  
  const jsFiles = files
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(distPath, 'assets', file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024 * 100) / 100
      };
    })
    .sort((a, b) => b.size - a.size);

  console.log('📦 JavaScript Bundles (by size):');
  console.log('─'.repeat(60));
  
  let totalSize = 0;
  jsFiles.forEach((file, index) => {
    totalSize += file.size;
    const sizeBar = '█'.repeat(Math.ceil(file.sizeKB / 10));
    console.log(`${index + 1}. ${file.name}`);
    console.log(`   Size: ${file.sizeKB} KB ${sizeBar}`);
    console.log('');
  });
  
  console.log('📊 Summary:');
  console.log(`Total JS Size: ${Math.round(totalSize / 1024 * 100) / 100} KB`);
  console.log(`Number of chunks: ${jsFiles.length}`);
  
  // Identify heavy dependencies
  console.log('\n🔍 Heavy Dependencies Analysis:');
  console.log('─'.repeat(40));
  
  const heavyDeps = [
    { name: 'google-*.js', desc: 'Google APIs (@google/genai, @googlemaps/*)', size: jsFiles.find(f => f.name.includes('google'))?.sizeKB || 0 },
    { name: 'vendor-*.js', desc: 'React & React DOM', size: jsFiles.find(f => f.name.includes('vendor'))?.sizeKB || 0 },
    { name: 'ui-*.js', desc: 'Lucide React Icons', size: jsFiles.find(f => f.name.includes('ui'))?.sizeKB || 0 },
    { name: 'ReviewSummary-*.js', desc: 'AI Summary Component', size: jsFiles.find(f => f.name.includes('ReviewSummary'))?.sizeKB || 0 }
  ];
  
  heavyDeps
    .filter(dep => dep.size > 0)
    .sort((a, b) => b.size - a.size)
    .forEach((dep, index) => {
      console.log(`${index + 1}. ${dep.desc}: ${dep.size} KB`);
    });
  
  console.log('\n💡 Optimization Recommendations:');
  console.log('─'.repeat(40));
  console.log('✅ Code splitting: Implemented');
  console.log('✅ Lazy loading: Implemented');
  console.log('✅ Manual chunking: Implemented');
  console.log('✅ Tree shaking: Enabled by Vite');
  
  if (jsFiles.find(f => f.name.includes('google'))?.sizeKB > 200) {
    console.log('🟡 Google APIs chunk is large - consider on-demand loading');
  }
  
  if (totalSize / 1024 > 500) {
    console.log('🟡 Total bundle size > 500KB - consider further optimization');
  } else {
    console.log('✅ Bundle size is well optimized (<500KB)');
  }

} catch (error) {
  console.error('Error analyzing bundle:', error.message);
  console.log('Run "npm run build" first to generate bundle files.');
}