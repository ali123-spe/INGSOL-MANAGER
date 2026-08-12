// src/services/db.js

const DB_NAME = 'ContentCalendarDB';
const DB_VERSION = 1;

/**
 * Open connection to IndexedDB
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database failed to open:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create posts store
      if (!db.objectStoreNames.contains('posts')) {
        const postsStore = db.createObjectStore('posts', { keyPath: 'id' });
        postsStore.createIndex('date', 'date', { unique: false });
        postsStore.createIndex('status', 'status', { unique: false });
      }

      // Create media store
      if (!db.objectStoreNames.contains('media')) {
        db.createObjectStore('media', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Retrieve all posts
 */
export async function getAllPosts() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('posts', 'readonly');
    const store = transaction.objectStore('posts');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get a specific media blob by ID
 */
export async function getMediaBlob(id) {
  if (!id) return null;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('media', 'readonly');
    const store = transaction.objectStore('media');
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result ? request.result.blob : null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Save a post, including associated media files
 * @param {Object} post The post metadata
 * @param {Object} filesMap A map of mediaId -> File/Blob object
 */
export async function savePost(post, filesMap = {}) {
  const db = await initDB();
  
  // 1. Save all files to media store
  if (Object.keys(filesMap).length > 0) {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('media', 'readwrite');
      const store = transaction.objectStore('media');

      let completed = 0;
      const fileIds = Object.keys(filesMap);

      if (fileIds.length === 0) {
        resolve();
        return;
      }

      fileIds.forEach((id) => {
        const blob = filesMap[id];
        const req = store.put({ id, blob });
        
        req.onsuccess = () => {
          completed++;
          if (completed === fileIds.length) {
            resolve();
          }
        };

        req.onerror = () => {
          reject(req.error);
        };
      });
    });
  }

  // 2. Save/Update the post metadata
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('posts', 'readwrite');
    const store = transaction.objectStore('posts');
    
    // Add timestamps
    const now = new Date().toISOString();
    const updatedPost = {
      ...post,
      updatedAt: now,
      createdAt: post.createdAt || now
    };

    const request = store.put(updatedPost);

    request.onsuccess = () => {
      resolve(updatedPost);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Delete a post and all its media files
 */
export async function deletePost(id) {
  const db = await initDB();
  
  // Find the post first to collect media IDs to clean up
  const post = await new Promise((resolve, reject) => {
    const transaction = db.transaction('posts', 'readonly');
    const store = transaction.objectStore('posts');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!post) return;

  // Gather all associated media IDs
  const mediaIds = [];
  if (post.mediaId) mediaIds.push(post.mediaId);
  if (post.carouselSlides && post.carouselSlides.length > 0) {
    post.carouselSlides.forEach(slide => {
      if (slide.mediaId) mediaIds.push(slide.mediaId);
    });
  }

  // Delete media blobs
  if (mediaIds.length > 0) {
    await new Promise((resolve) => {
      const transaction = db.transaction('media', 'readwrite');
      const store = transaction.objectStore('media');
      let deletedCount = 0;

      mediaIds.forEach(mediaId => {
        const req = store.delete(mediaId);
        req.onsuccess = req.onerror = () => {
          deletedCount++;
          if (deletedCount === mediaIds.length) {
            resolve();
          }
        };
      });
    });
  }

  // Delete post
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('posts', 'readwrite');
    const store = transaction.objectStore('posts');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Programmatic SVG generator for seeding professional sample posts
 */
function createSvgSlide(title, subtitle, slideNum, totalSlides, bgColor = '#0f172a', accentColor = '#38bdf8') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      
      <!-- Graphic Elements -->
      <circle cx="540" cy="540" r="450" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.15"/>
      <circle cx="540" cy="540" r="300" fill="none" stroke="${accentColor}" stroke-width="4" stroke-dasharray="10 15" opacity="0.3"/>
      <circle cx="540" cy="540" r="150" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.1"/>
      
      <!-- Framing corner lines -->
      <path d="M 60 120 L 60 60 L 120 60" fill="none" stroke="${accentColor}" stroke-width="4" opacity="0.6"/>
      <path d="M 1020 120 L 1020 60 L 960 60" fill="none" stroke="${accentColor}" stroke-width="4" opacity="0.6"/>
      <path d="M 60 960 L 60 1020 L 120 1020" fill="none" stroke="${accentColor}" stroke-width="4" opacity="0.6"/>
      <path d="M 1020 960 L 1020 1020 L 960 1020" fill="none" stroke="${accentColor}" stroke-width="4" opacity="0.6"/>
      
      <!-- Slide Numbering (top right) -->
      \${totalSlides > 1 ? \`
      <rect x="910" y="90" width="110" height="50" rx="25" fill="#1e293b" stroke="\${accentColor}" stroke-width="2" opacity="0.8"/>
      <text x="965" y="122" text-anchor="middle" fill="\${accentColor}" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold">\${slideNum}/\${totalSlides}</text>
      \` : ''}

      <!-- Branding (top left) -->
      <text x="140" y="100" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800" letter-spacing="2">ANTIGRAVITY</text>
      <circle cx="95" cy="90" r="15" fill="${accentColor}"/>
      
      <!-- Content -->
      <text x="540" y="440" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="500" letter-spacing="4">\${subtitle.toUpperCase()}</text>
      <text x="540" y="550" text-anchor="middle" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="800" letter-spacing="-1">\${title}</text>
      
      <!-- Footer decoration -->
      <line x1="180" y1="800" x2="900" y2="800" stroke="${accentColor}" stroke-width="2" opacity="0.4"/>
      <text x="540" y="870" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" letter-spacing="1">INTERNAL USE ONLY • SOCIAL CONTENT CALENDAR</text>
    </svg>
  `;
  return new Blob([svg], { type: 'image/svg+xml' });
}

/**
 * Seed the IndexedDB with professional sample posts if empty
 */
export async function seedSampleData() {
  const posts = await getAllPosts();
  if (posts.length > 0) {
    return; // Already seeded
  }

  console.log('Seeding database with sample posts and SVG slides...');

  const filesMap = {};

  // Post 1: Smart Factory (Carousel, 10 slides)
  const p1Id = 'post_seed_1';
  const p1Slides = [];
  const p1SlidesContent = [
    { title: 'What Smart Factory Actually Means', subtitle: 'Demystifying Industry 4.0' },
    { title: '1. Machine-to-Machine Connectivity', subtitle: 'The foundation' },
    { title: '2. Real-Time Data Streams', subtitle: 'Telemetry and sensing' },
    { title: '3. AI Predictive Analytics', subtitle: 'Predicting issues before they happen' },
    { title: '4. Autonomous Closed Loops', subtitle: 'Self-correcting hardware' },
    { title: '5. Cyber-Physical Orchestration', subtitle: 'Blending physical with digital' },
    { title: '6. Energy & Resource Efficiency', subtitle: 'Smarter power management' },
    { title: '7. Worker Augmentation', subtitle: 'AR and automation helper interfaces' },
    { title: '8. Supply Chain Syncing', subtitle: 'End-to-end responsiveness' },
    { title: 'Summary & Key Takeaways', subtitle: 'Next steps for your business' }
  ];

  p1SlidesContent.forEach((slide, idx) => {
    const slideId = `media_seed_p1_s\${idx + 1}`;
    const blob = createSvgSlide(slide.title, slide.subtitle, idx + 1, 10, '#0f172a', '#38bdf8');
    filesMap[slideId] = blob;
    p1Slides.push({
      id: `slide_seed_p1_s\${idx + 1}`,
      order: idx + 1,
      mediaId: slideId,
      originalFileName: `smart_factory_slide_\${idx + 1}.svg`
    });
  });

  const p1Post = {
    id: p1Id,
    title: 'What Smart Factory Actually Means',
    date: '2026-08-12',
    platform: 'LinkedIn',
    contentType: 'Carousel',
    status: 'Published',
    caption: `Smart Factory is not just about automation. It's about data-driven decision making, interconnectivity, and machine-to-machine collaboration. Here is what it actually means:\n\n1. Real-time data streams\n2. Predictive maintenance\n3. Closed-loop control\n\nRead the slides to find out more!`,
    notes: 'Need approval from the VP of Product marketing before publishing on LinkedIn.',
    tags: ['Smart Factory', 'Industry 4.0', 'Manufacturing'],
    figmaUrl: 'https://www.figma.com/file/LK8g9d87d9A8d/Smart-Factory-Posts?node-id=105%3A248',
    publishedUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:78491028492019',
    mediaId: 'media_seed_p1_s1', // Cover slide is main thumbnail
    carouselSlides: p1Slides,
  };

  // Post 2: MES Implementation Roadmap (Single Image, 1 slide)
  const p2Id = 'post_seed_2';
  const p2MediaId = 'media_seed_p2';
  const p2Blob = createSvgSlide('MES Implementation Roadmap', '5 steps to manufacturing execution success', 1, 1, '#1e1b4b', '#f43f5e');
  filesMap[p2MediaId] = p2Blob;

  const p2Post = {
    id: p2Id,
    title: 'MES Implementation Roadmap',
    date: '2026-08-18',
    platform: 'LinkedIn',
    contentType: 'Single Image',
    status: 'Scheduled',
    caption: `Implementing an MES (Manufacturing Execution System) is a journey. Here is a quick overview of the roadmap to success:\n\n1. Discovery & Needs Assessment\n2. System Architecture Design\n3. Pilot Phase Deployment\n4. Site-Wide Rollout\n5. Continuous Tuning`,
    notes: 'Confirm standard post captions with the branding guidelines check sheet.',
    tags: ['MES', 'Industry 4.0', 'Roadmap'],
    figmaUrl: 'https://www.figma.com/file/LK8g9d87d9A8d/Smart-Factory-Posts?node-id=230%3A12',
    publishedUrl: '',
    mediaId: p2MediaId,
    carouselSlides: []
  };

  // Post 3: Industry 4.0 IoT Adoption (Video/Reel)
  const p3Id = 'post_seed_3';
  const p3MediaId = 'media_seed_p3';
  const p3Blob = createSvgSlide('IIoT Real-time Dashboards', 'How to monitor factory lines remotely', 1, 1, '#022c22', '#10b981');
  filesMap[p3MediaId] = p3Blob;

  const p3Post = {
    id: p3Id,
    title: 'IIoT Real-Time Dashboards Demo',
    date: '2026-08-20',
    platform: 'Instagram',
    contentType: 'Reel',
    status: 'Ready',
    caption: 'Tired of manual logs? Here is a live walkthrough of remote IIoT line telemetry. Real-time OEE dashboards at your fingertips. #Manufacturing #IoT #Tech',
    notes: 'Draft video thumbnail uploaded. We might want to overlay a play icon on this.',
    tags: ['IIoT', 'OEE', 'Automation'],
    figmaUrl: 'https://www.figma.com/file/LK8g9d87d9A8d/Smart-Factory-Posts?node-id=560%3A89',
    publishedUrl: '',
    mediaId: p3MediaId,
    carouselSlides: []
  };

  // Post 4: Draft Post
  const p4Id = 'post_seed_4';
  const p4MediaId = 'media_seed_p4';
  const p4Blob = createSvgSlide('Tyre Manufacturing Automation', 'AI vision system inspects tyres', 1, 1, '#1e293b', '#e2e8f0');
  filesMap[p4MediaId] = p4Blob;

  const p4Post = {
    id: p4Id,
    title: 'AI Inspection for Quality Control',
    date: '2026-08-20',
    platform: 'Facebook',
    contentType: 'Single Image',
    status: 'Draft',
    caption: 'Integrating automated computer vision into heavy tyre vulcanization lines reduces inspection slips by 98%. Here is the concept design.',
    notes: 'Waiting for graphic approval from engineering.',
    tags: ['Quality Control', 'AI Vision', 'Tyre'],
    figmaUrl: 'https://www.figma.com/file/LK8g9d87d9A8d/Smart-Factory-Posts?node-id=901%3A33',
    publishedUrl: '',
    mediaId: p4MediaId,
    carouselSlides: []
  };

  // Save all to database
  await savePost(p1Post, filesMap);
  await savePost(p2Post, filesMap);
  await savePost(p3Post, filesMap);
  await savePost(p4Post, filesMap);

  console.log('Sample data seeded successfully!');
}
