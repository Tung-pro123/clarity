/* ==========================================================================
   GLOBAL UTILITIES & NAVIGATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Lock body scroll initially for intro
  document.body.classList.add('welcome-active');

  // Shared Helper to convert hex to RGBA
  function hexToRgbA(hex, alpha) {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
      c= hex.substring(1).split('');
      if(c.length== 3){
        c= [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c= '0x' + c.join('');
      return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return 'rgba(255,255,255,' + alpha + ')';
  }

  // Shared Helper to draw beautiful 4-point star flares
  function draw4PointStar(ctx, cx, cy, radius, alpha, color, glowRadius) {
    ctx.save();
    
    // Draw star glow background
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius * alpha * 2.2);
    radGrad.addColorStop(0, color);
    radGrad.addColorStop(0.3, hexToRgbA(color, alpha * 0.35));
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw horizontal/vertical spike flares using bezier quadratic curves
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius * 2.6);
    ctx.quadraticCurveTo(cx, cy, cx + radius * 2.6, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + radius * 2.6);
    ctx.quadraticCurveTo(cx, cy, cx - radius * 2.6, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - radius * 2.6);
    ctx.fill();
    
    // Draw inner bright core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  // Shared Helper to draw a beautiful, slow-drifting cosmic nebula on any canvas
  function drawNebulaBackground(ctx, width, height, time) {
    // 1. Deep space background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // 2. Nebula 1: Purple Cloud
    const x1 = width * 0.35 + Math.sin(time * 0.002) * 80;
    const y1 = height * 0.4 + Math.cos(time * 0.001) * 60;
    const grad1 = ctx.createRadialGradient(x1, y1, 10, x1, y1, Math.min(width, height) * 0.65);
    grad1.addColorStop(0, 'rgba(114, 9, 183, 0.15)');
    grad1.addColorStop(0.5, 'rgba(114, 9, 183, 0.03)');
    grad1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, width, height);

    // 3. Nebula 2: Teal Cloud
    const x2 = width * 0.65 + Math.cos(time * 0.0015) * 100;
    const y2 = height * 0.55 + Math.sin(time * 0.002) * 70;
    const grad2 = ctx.createRadialGradient(x2, y2, 20, x2, y2, Math.min(width, height) * 0.65);
    grad2.addColorStop(0, 'rgba(0, 245, 212, 0.12)');
    grad2.addColorStop(0.5, 'rgba(0, 245, 212, 0.03)');
    grad2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, width, height);
    
    // 4. Nebula 3: Blue Cloud
    const x3 = width * 0.5 + Math.sin(time * 0.001) * 60;
    const y3 = height * 0.3 + Math.cos(time * 0.001) * 50;
    const grad3 = ctx.createRadialGradient(x3, y3, 5, x3, y3, Math.min(width, height) * 0.6);
    grad3.addColorStop(0, 'rgba(67, 97, 238, 0.14)');
    grad3.addColorStop(0.6, 'rgba(67, 97, 238, 0.03)');
    grad3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad3;
    ctx.fillRect(0, 0, width, height);
  }

  // ==================== SHARED SERVERLESS REALTIME DATABASE ====================
  // Self-bootstrapping database. Uses keyvalue.immanuel.co for bucket discovery 
  // and dynamically provisions a working kvdb.io bucket for all users globally.
  const DISCOVERY_URL = 'https://keyvalue.immanuel.co/api/KeyVal/GetValue/sitihope/bucket_id';
  const UPDATE_DISCOVERY_URL = 'https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/sitihope/bucket_id/';
  
  let DB_URL = '';
  let activeBucketId = '';

  async function bootstrapDatabase() {
    try {
      // 1. Try to fetch the shared bucket ID from the discovery server
      const res = await fetch(DISCOVERY_URL);
      if (res.ok) {
        const text = await res.text();
        const cleanedId = text.replace(/"/g, '').trim();
        if (cleanedId && cleanedId !== 'null' && cleanedId.length > 5) {
          activeBucketId = cleanedId;
          DB_URL = `https://kvdb.io/${activeBucketId}/messages`;
          console.log("Database bootstrapped with shared bucket ID:", activeBucketId);
          return;
        }
      }
      
      // 2. If no bucket exists, register a fresh one dynamically on kvdb.io
      console.log("No shared bucket found. Creating a new one...");
      const createRes = await fetch('https://kvdb.io/', { method: 'POST' });
      if (createRes.ok) {
        const newBucketId = (await createRes.text()).trim();
        if (newBucketId) {
          activeBucketId = newBucketId;
          DB_URL = `https://kvdb.io/${activeBucketId}/messages`;
          
          // Share this bucket ID with all other machines
          await fetch(`${UPDATE_DISCOVERY_URL}${newBucketId}`, { method: 'POST' });
          console.log("New shared bucket created and registered:", newBucketId);
          return;
        }
      }
    } catch (err) {
      console.warn("Database bootstrapping error. Using fallback:", err);
    }
    
    // 3. Robust offline fallback
    DB_URL = 'https://kvdb.io/siti_hope_2026_fallback/messages';
  }
  
  const defaultWishes = [
    { author: "Khánh Linh", text: "Mong các em luôn tràn ngập tiếng cười và giữ mãi ngọn lửa kiên cường!", color: "#ffb703", px: 0.15, py: 0.25 },
    { author: "Hữu Nam (SiTiGroup)", text: "Dù cuộc sống có những gập ghềnh, anh chị sẽ luôn bên cạnh để nâng bước các em.", color: "#00f5d4", px: 0.45, py: 0.35 },
    { author: "Cô Mai Lan", text: "Chúc các con nuôi dưỡng ước mơ thật đẹp và biến chúng thành hiện thực.", color: "#a2d2ff", px: 0.8, py: 0.3 },
    { author: "Minh Quân", text: "Các em là những ngôi sao kiên cường nhất, tỏa sáng rực rỡ nhất trên bầu trời này.", color: "#ff007f", px: 0.3, py: 0.65 },
    { author: "Thanh Hằng", text: "Gửi ngàn cái ôm ấm áp và tình yêu thương đong đầy nhất tới mái ấm Hy Vọng.", color: "#ffb703", px: 0.75, py: 0.6 },
    { author: "Đức Trí (FPTU)", text: "Hãy luôn tự tin vững bước, xã hội luôn yêu thương và sẵn sàng đồng hành cùng các em.", color: "#00f5d4", px: 0.25, py: 0.45 },
    { author: "Gia Bảo", text: "Mong rằng chút ánh sáng nhỏ bé này sẽ mang lại niềm vui lớn lao cho các con.", color: "#a2d2ff", px: 0.6, py: 0.2 },
    { author: "Hồng Ngọc", text: "Yêu thương cho đi là yêu thương còn mãi. Chúc các em luôn bình an, mạnh khỏe nhé!", color: "#ff007f", px: 0.5, py: 0.7 }
  ];

  let sharedStars = [];
  let wStars = [];
  let stars = [];

  // Unified Star Class (Responsive percentage-based positioning)
  class Star {
    constructor(px, py, author, text, color, isCustom = false) {
      this.px = px;
      this.py = py;
      this.x = 0;
      this.y = 0;
      this.author = author;
      this.text = text;
      this.color = color;
      this.isCustom = isCustom;
      this.size = isCustom ? 6 : Math.random() * 2 + 1.5;
      this.alpha = Math.random() * 0.5 + 0.5;
      this.speed = Math.random() * 0.01 + 0.005;
      this.dir = 1;
      this.glowRadius = isCustom ? 20 : 6;
    }
    
    update() {
      this.alpha += this.speed * this.dir;
      if (this.alpha > 1 || this.alpha < 0.3) this.dir *= -1;
    }
    
    draw(ctx2d) {
      draw4PointStar(ctx2d, this.x, this.y, this.size, this.alpha, this.color, this.glowRadius);
    }
  }

  // Helper to add and sync star with multi-device realtime database
  async function addStarToDatabase(author, text, color, px, py, isCustom = true) {
    try {
      // 1. Fetch latest stars array from kvdb.io to ensure we merge concurrent inputs
      let currentList = [];
      const response = await fetch(DB_URL);
      if (response.ok) {
        const cloudData = await response.json();
        if (Array.isArray(cloudData)) {
          currentList = cloudData;
        }
      }
      
      // 2. Append new star
      const newStarObj = { author, text, color, px, py, isCustom };
      currentList.push(newStarObj);
      
      // 3. Save updated list locally & globally
      sharedStars = currentList;
      localStorage.setItem('siti_hope_stars', JSON.stringify(sharedStars));
      
      await fetch(DB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sharedStars)
      });
      
      // 4. Update canvas renderings instantly
      initializeAllCanvases();
    } catch (err) {
      console.warn("Cloud DB sync failed in addStarToDatabase. Saving locally:", err);
      const newStarObj = { author, text, color, px, py, isCustom };
      sharedStars.push(newStarObj);
      localStorage.setItem('siti_hope_stars', JSON.stringify(sharedStars));
      initializeAllCanvases();
    }
  }

  // Shared function to initialize stars on both canvas elements once data syncs
  function initializeAllCanvases() {
    // 1. Welcome Screen Canvas stars (ALL stars)
    wStars = [];
    if (welcomeCanvas) {
      sharedStars.forEach(star => {
        const px = star.px !== undefined ? star.px : Math.random() * 0.7 + 0.15;
        const py = star.py !== undefined ? star.py : Math.random() * 0.6 + 0.2;
        star.px = px;
        star.py = py;
        const sInstance = new Star(px, py, star.author, star.text, star.color, star.isCustom);
        sInstance.x = welcomeCanvas.width * px;
        sInstance.y = welcomeCanvas.height * py;
        wStars.push(sInstance);
      });
    }
    
    // 2. Main Constellation Canvas stars (ALL stars)
    stars = [];
    if (wishCanvas) {
      sharedStars.forEach(star => {
        const px = star.px !== undefined ? star.px : Math.random() * 0.7 + 0.15;
        const py = star.py !== undefined ? star.py : Math.random() * 0.6 + 0.2;
        star.px = px;
        star.py = py;
        const sInstance = new Star(px, py, star.author, star.text, star.color, star.isCustom);
        sInstance.x = wishCanvas.width * px;
        sInstance.y = wishCanvas.height * py;
        stars.push(sInstance);
      });
    }
  }

  // Load from database or fallbacks
  async function syncDatabase() {
    try {
      // 1. Try local storage cache first
      const cached = localStorage.getItem('siti_hope_stars');
      if (cached) {
        sharedStars = JSON.parse(cached);
      } else {
        sharedStars = [...defaultWishes];
      }

      // 2. Fetch latest from public cloud KV store
      const response = await fetch(DB_URL);
      if (response.ok) {
        const cloudData = await response.json();
        if (Array.isArray(cloudData) && cloudData.length > 0) {
          sharedStars = cloudData;
          localStorage.setItem('siti_hope_stars', JSON.stringify(cloudData));
        }
      } else if (response.status === 404) {
        // Initialize cloud database with defaults if empty
        await saveToCloud(sharedStars);
      }
    } catch (err) {
      console.warn("Cloud DB sync failed. Running in offline fallback mode:", err);
      if (sharedStars.length === 0) sharedStars = [...defaultWishes];
    }
  }

  // Trigger Bootstrap, Sync & Init immediately
  bootstrapDatabase().then(() => {
    syncDatabase().then(() => {
      initializeAllCanvases();
    });
  });

  // Upload updated stars to cloud
  async function saveToCloud(starsArray) {
    try {
      localStorage.setItem('siti_hope_stars', JSON.stringify(starsArray));
      await fetch(DB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(starsArray)
      });
    } catch (e) {
      console.error("Cloud DB write failed:", e);
    }
  }

  // ==================== WELCOME OVERLAY SCREEN INTERACTIVE ====================
  const welcomeScreen = document.getElementById('welcome-screen');
  const welcomeCanvas = document.getElementById('welcome-stars-canvas');
  const welcomeFormCard = document.getElementById('welcome-form-card');
  const welcomeNameInput = document.getElementById('welcome-name-input');
  const welcomeMsgInput = document.getElementById('welcome-msg-input');
  
  const btnStart = document.getElementById('btn-start-journey');
  const btnSkip = document.getElementById('btn-skip-welcome');
  const btnGoHome = document.getElementById('btn-go-home');
  const navWelcomeMsg = document.getElementById('nav-welcome-msg');
  
  if (welcomeScreen && welcomeCanvas) {
    const wCtx = welcomeCanvas.getContext('2d');
    // Custom Star states
    let customStar = null;
    let isRising = false;
    let customStarTargetY = 0;
    let customStarCurrentY = 0;
    let risingComplete = false;
    
    function resizeWelcomeCanvas() {
      welcomeCanvas.width = welcomeScreen.clientWidth;
      welcomeCanvas.height = welcomeScreen.clientHeight;
      wStars.forEach(s => {
        s.x = welcomeCanvas.width * s.px;
        s.y = welcomeCanvas.height * s.py;
      });
    }
    
    window.addEventListener('resize', resizeWelcomeCanvas);
    resizeWelcomeCanvas();
    
    // Twinkling canvas background loop
    let welcomeNebTime = 0;
    function animateWelcomeCanvas() {
      if (!welcomeScreen.classList.contains('fade-out')) {
        drawNebulaBackground(wCtx, welcomeCanvas.width, welcomeCanvas.height, welcomeNebTime++);
        
        // Draw constellation lines between background stars
        wCtx.strokeStyle = 'rgba(162, 210, 255, 0.04)';
        wCtx.lineWidth = 1;
        wCtx.beginPath();
        for (let i = 0; i < wStars.length; i++) {
          for (let j = i + 1; j < wStars.length; j++) {
            const dist = Math.hypot(wStars[i].x - wStars[j].x, wStars[i].y - wStars[j].y);
            if (dist < welcomeCanvas.width * 0.16) {
              wCtx.moveTo(wStars[i].x, wStars[i].y);
              wCtx.lineTo(wStars[j].x, wStars[j].y);
            }
          }
        }
        wCtx.stroke();
        
        // Update & Draw background stars
        wStars.forEach(s => {
          s.update();
          s.draw(wCtx);
        });
        
        // Handle rising animation of user custom star
        if (isRising && customStar) {
          // Slow rise with easing
          customStarCurrentY -= (customStarCurrentY - customStarTargetY) * 0.04;
          customStar.y = customStarCurrentY;
          
          customStar.update();
          customStar.draw(wCtx);
          
          // Draw connector line from rising star to nearby stars
          wCtx.strokeStyle = 'rgba(0, 245, 212, 0.12)';
          wCtx.lineWidth = 1.2;
          wCtx.beginPath();
          wStars.forEach(s => {
            const d = Math.hypot(customStar.x - s.x, customStar.y - s.y);
            if (d < 220) {
              wCtx.moveTo(customStar.x, customStar.y);
              wCtx.lineTo(s.x, s.y);
            }
          });
          wCtx.stroke();
          
          // Check if Y has reached the target threshold
          if (Math.abs(customStarCurrentY - customStarTargetY) < 1.5 && !risingComplete) {
            risingComplete = true;
            customStarCurrentY = customStarTargetY;
            customStar.y = customStarTargetY;
            
            // Trigger star birth complete (DOM Popup & Confetti)
            revealUserStarTooltip(customStar.x, customStar.y, customStar.author, customStar.text);
            
            // Save this star permanently to cloud and local storage
            addStarToDatabase(customStar.author, customStar.text, customStar.color, customStar.px, customStar.py, true);
            
            // Instantly mark rising complete to avoid duplication or double rendering
            isRising = false;
            customStar = null;
            
            // Trigger 5-second countdown to show home button
            setTimeout(() => {
              btnGoHome.style.display = 'block';
              setTimeout(() => {
                btnGoHome.classList.add('visible');
              }, 50);
            }, 5000);
          }
        }
        
        requestAnimationFrame(animateWelcomeCanvas);
      }
    }
    animateWelcomeCanvas();
    
    // DOM overlay card creation for the user's dệt sao message
    function revealUserStarTooltip(x, y, author, text) {
      const tooltipCard = document.createElement('div');
      tooltipCard.className = 'star-tooltip glass visible';
      tooltipCard.style.position = 'absolute';
      tooltipCard.style.top = `${y - 150}px`;
      tooltipCard.style.left = `${x - 140}px`;
      tooltipCard.style.transform = 'scale(0.8) translateY(15px)';
      tooltipCard.style.opacity = '0';
      tooltipCard.style.border = '1px solid var(--secondary)';
      tooltipCard.style.boxShadow = '0 10px 30px rgba(0, 245, 212, 0.25)';
      tooltipCard.style.zIndex = '5';
      tooltipCard.style.transition = 'all 1s cubic-bezier(0.16, 1, 0.3, 1)';
      
      tooltipCard.innerHTML = `
        <div class="tooltip-star-icon" style="color:var(--secondary);">★</div>
        <div class="tooltip-author">${author}</div>
        <div class="tooltip-text">${text}</div>
        <div class="tooltip-time">Đã dệt sao thành công ✨</div>
      `;
      
      welcomeScreen.appendChild(tooltipCard);
      
      // Animate tooltip card show
      setTimeout(() => {
        tooltipCard.style.opacity = '1';
        tooltipCard.style.transform = 'scale(1) translateY(0)';
        
        // Small confetti shower
        const colors = ['#00f5d4', '#ffb703', '#ffffff'];
        for (let i = 0; i < 20; i++) {
          const bit = document.createElement('div');
          bit.className = 'confetti-piece';
          bit.style.left = `${x + (Math.random() * 100 - 50)}px`;
          bit.style.top = `${y + (Math.random() * 60 - 30)}px`;
          bit.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          bit.style.width = '6px'; bit.style.height = '6px';
          bit.style.animationDuration = '1.5s';
          welcomeScreen.appendChild(bit);
          setTimeout(() => bit.remove(), 1500);
        }
      }, 200);
    }
    
    // Core Personalization & Global Sync Function
    let savedUserName = "Bạn";
    let savedUserMsg = "Dệt nên một vì sao hy vọng!";
    
    function applyPersonalization(nameVal, msgVal) {
      savedUserName = nameVal.trim() !== "" ? nameVal.trim() : "Bạn";
      savedUserMsg = msgVal.trim() !== "" ? msgVal.trim() : "Dệt nên một vì sao hy vọng!";
      
      // Update all DOM placeholders
      document.querySelectorAll('.user-name-val').forEach(el => {
        el.textContent = savedUserName;
      });
      
      // Pre-fill Trạm 3 wishing form fields
      const wishAuthorInput = document.getElementById('wish-author');
      const wishTextInput = document.getElementById('wish-text');
      if (wishAuthorInput) wishAuthorInput.value = savedUserName;
      if (wishTextInput) wishTextInput.value = savedUserMsg;
      
      // Show Navbar Greeting
      if (navWelcomeMsg) {
        navWelcomeMsg.style.display = 'inline-block';
      }
    }
    
    // Button "Dệt Sáng" click listener
    btnStart.addEventListener('click', () => {
      const name = welcomeNameInput.value.trim();
      const msg = welcomeMsgInput.value.trim();
      
      if (name === "" || msg === "") {
        alert("Vui lòng điền đầy đủ Tên và Lời chúc của bạn để dệt sáng nhé!");
        return;
      }
      
      applyPersonalization(name, msg);
      
      // Hide input form card
      welcomeFormCard.classList.add('fade-out-card');
      setTimeout(() => {
        welcomeFormCard.style.display = 'none';
      }, 850);
      
      // Initialize rising custom star!
      const randPx = Math.random() * 0.6 + 0.2; // 20% to 80% width
      const randPy = Math.random() * 0.5 + 0.2; // 20% to 70% height
      
      const startX = welcomeCanvas.width * randPx;
      const startY = welcomeCanvas.height * 0.95;
      
      customStar = new Star(randPx, randPy, savedUserName, savedUserMsg, "#00f5d4", true);
      customStar.x = startX;
      customStar.y = startY;
      customStarTargetY = welcomeCanvas.height * randPy;
      customStarCurrentY = startY;
      risingComplete = false;
      
      // Trigger slow rise animation
      setTimeout(() => {
        isRising = true;
      }, 600);
    });
    
    // Skip Intro screen immediately
    btnSkip.addEventListener('click', () => {
      applyPersonalization("Bạn", "Chúc các em luôn dũng cảm vững bước!");
      
      welcomeScreen.classList.add('fade-out');
      document.body.classList.remove('welcome-active');
      setTimeout(() => {
        welcomeScreen.style.display = 'none';
      }, 1200);
    });
    
    // Enter key press triggers on inputs
    welcomeNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') welcomeMsgInput.focus(); });
    welcomeMsgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnStart.click(); });
    
    // "Tiến Vào Trang Chủ" Button Click listener (unlocks everything)
    btnGoHome.addEventListener('click', () => {
      welcomeScreen.classList.add('fade-out');
      document.body.classList.remove('welcome-active');
      
      // Fire celebrating confetti
      setTimeout(() => {
        const confContainer = document.getElementById('confetti-container');
        if (confContainer) {
          // Trigger confetti shower
          const colors = ['#7209b7', '#00f5d4', '#ffb703', '#4361ee', '#ff007f'];
          for (let i = 0; i < 40; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = '8px'; confetti.style.height = '14px';
            confetti.style.animationDuration = '3s';
            confContainer.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
          }
        }
        welcomeScreen.style.display = 'none';
      }, 1200);
    });
  }

  // Sticky Navbar
  const navbar = document.getElementById('main-nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Mobile Menu
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu-panel');
  
  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    menuBtn.classList.toggle('active');
    
    // Animate hamburger lines
    const spans = menuBtn.querySelectorAll('span');
    if (mobileMenu.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    }
  });

  // Close Mobile Menu on Link Click
  const mobileLinks = document.querySelectorAll('.mobile-link');
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      const spans = menuBtn.querySelectorAll('span');
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    });
  });

  // ==================== SINGLE PAGE APPLICATION TAB ROUTER ====================
  const navLinks = document.querySelectorAll('.nav-link, .mobile-link, .nav-logo, .hero-btns a, .footer-col-links ul a');
  const pageTabs = document.querySelectorAll('.page-tab');
  
  function switchTab(targetTabId) {
    const cleanId = targetTabId.replace('#', '');
    const targetSection = document.getElementById(cleanId);
    if (!targetSection) return;
    
    // Hide active tabs
    pageTabs.forEach(tab => {
      tab.classList.remove('active-tab');
    });
    
    // Remove active styles from links
    document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // Activate target tab
    targetSection.classList.add('active-tab');
    
    // Highlight matching links
    document.querySelectorAll(`a[href="#${cleanId}"]`).forEach(link => {
      link.classList.add('active');
    });
    
    // Scroll smoothly to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Prevent stretch on wishing canvas when revealing constellation tab
    if (cleanId === 'constellation' && window.resizeWishCanvas) {
      setTimeout(window.resizeWishCanvas, 150);
    }
  }

  // Hook nav actions
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        switchTab(href);
      }
    });
  });

  // Expose routing function globally
  window.navigateToTab = switchTab;


  /* ==========================================================================
     HERO SPACE PARTICLE CANVAS
     ========================================================================== */
  const heroCanvas = document.getElementById('hero-stars-canvas');
  if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    let particles = [];
    
    function resizeHeroCanvas() {
      heroCanvas.width = heroCanvas.parentElement.clientWidth;
      heroCanvas.height = heroCanvas.parentElement.clientHeight;
    }
    
    window.addEventListener('resize', resizeHeroCanvas);
    resizeHeroCanvas();
    
    class Particle {
      constructor() {
        this.x = Math.random() * heroCanvas.width;
        this.y = Math.random() * heroCanvas.height;
        this.size = Math.random() * 1.8 + 0.2;
        this.speedX = Math.random() * 0.15 - 0.075;
        this.speedY = Math.random() * 0.15 - 0.075;
        this.alpha = Math.random() * 0.5 + 0.2;
        this.alphaSpeed = Math.random() * 0.005 + 0.002;
        this.alphaDirection = 1;
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Bounce edges
        if (this.x < 0 || this.x > heroCanvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > heroCanvas.height) this.speedY *= -1;
        
        // Twinkle
        this.alpha += this.alphaSpeed * this.alphaDirection;
        if (this.alpha > 0.8 || this.alpha < 0.2) {
          this.alphaDirection *= -1;
        }
      }
      
      draw() {
        ctx.fillStyle = `rgba(0, 245, 212, ${this.alpha})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#00f5d4';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow
      }
    }
    
    // Spawn particles
    const particleCount = Math.min(60, Math.floor((heroCanvas.width * heroCanvas.height) / 15000));
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    
    function animateHeroCanvas() {
      ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animateHeroCanvas);
    }
    animateHeroCanvas();
  }


  /* ==========================================================================
     INTERACTIVE WISHING CONSTELLATION CANVAS (WISHING SKY)
     ========================================================================== */
  const wishCanvas = document.getElementById('wishing-sky-canvas');
  const tooltip = document.getElementById('star-tooltip');
  
  if (wishCanvas) {
    const ctx = wishCanvas.getContext('2d');
    let mouse = { x: null, y: null };
    let activeStar = null;
    
    // Background minor stars (decorative) - Responsive percentage-based positioning
    let backgroundStars = [];
    for (let i = 0; i < 40; i++) {
      backgroundStars.push({
        px: Math.random(),
        py: Math.random(),
        x: 0,
        y: 0,
        size: Math.random() * 1 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        speed: Math.random() * 0.005 + 0.002,
        dir: 1
      });
    }

    function resizeWishCanvas() {
      const container = wishCanvas.parentElement;
      if (!container) return;
      wishCanvas.width = container.clientWidth;
      wishCanvas.height = container.clientHeight;
      // Re-position custom stars to fit bounds using percentages
      stars.forEach(s => {
        s.x = wishCanvas.width * s.px;
        s.y = wishCanvas.height * s.py;
      });
      backgroundStars.forEach(bgStar => {
        bgStar.x = wishCanvas.width * bgStar.px;
        bgStar.y = wishCanvas.height * bgStar.py;
      });
    }
    
    window.addEventListener('resize', resizeWishCanvas);
    window.resizeWishCanvas = resizeWishCanvas;
    
    // Set canvas dimensions
    resizeWishCanvas();

    // Connect constellation lines based on resolution-aware distance threshold
    function drawConstellationLines() {
      ctx.strokeStyle = 'rgba(162, 210, 255, 0.035)';
      ctx.lineWidth = 0.8;
      
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dist = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
          if (dist < wishCanvas.width * 0.16) {
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }
    }

    // Animation Loop
    let wishNebTime = 0;
    function animateWishSky() {
      drawNebulaBackground(ctx, wishCanvas.width, wishCanvas.height, wishNebTime++);
      
      // Draw background decorative stars
      backgroundStars.forEach(bgStar => {
        bgStar.alpha += bgStar.speed * bgStar.dir;
        if (bgStar.alpha > 0.5 || bgStar.alpha < 0.1) bgStar.dir *= -1;
        ctx.fillStyle = `rgba(255, 255, 255, ${bgStar.alpha})`;
        ctx.beginPath();
        ctx.arc(bgStar.x, bgStar.y, bgStar.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw lines
      drawConstellationLines();
      
      // Draw main stars
      stars.forEach(star => {
        star.update();
        star.draw(ctx);
      });
      
      requestAnimationFrame(animateWishSky);
    }
    animateWishSky();
    
    // Mouse Interaction
    wishCanvas.addEventListener('mousemove', (e) => {
      const rect = wishCanvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      
      let foundActive = null;
      
      // Check collision
      for (let star of stars) {
        const dist = Math.hypot(star.x - mouse.x, star.y - mouse.y);
        if (dist < 16) {
          foundActive = star;
          break;
        }
      }
      
      if (foundActive) {
        if (activeStar !== foundActive) {
          activeStar = foundActive;
          
          // Animate star hover
          activeStar.glowRadius = activeStar.isCustom ? 24 : 15;
          
          // Show Tooltip
          document.getElementById('tooltip-author').textContent = activeStar.author;
          document.getElementById('tooltip-text').textContent = activeStar.text;
          
          tooltip.style.left = `${e.clientX - rect.left + 15}px`;
          tooltip.style.top = `${e.clientY - rect.top + 15}px`;
          tooltip.classList.add('visible');
        } else {
          // Update tooltip position
          tooltip.style.left = `${e.clientX - rect.left + 15}px`;
          tooltip.style.top = `${e.clientY - rect.top + 15}px`;
        }
      } else {
        if (activeStar) {
          activeStar.glowRadius = activeStar.isCustom ? 15 : 6;
          activeStar = null;
          tooltip.classList.remove('visible');
        }
      }
    });
    
    wishCanvas.addEventListener('mouseleave', () => {
      if (activeStar) {
        activeStar.glowRadius = activeStar.isCustom ? 15 : 6;
        activeStar = null;
      }
      tooltip.classList.remove('visible');
    });

    // Tap to spawn random star (Innovation)
    const randomWishes = [
      "Mong các bé luôn dũng cảm đón nhận tình yêu thương của thế giới nhé!",
      "Nụ cười của các em là động lực quý giá nhất đối với chúng ta.",
      "Gửi gắm niềm tin yêu của tôi mong các con luôn mạnh khỏe bình an.",
      "Chúc các bé ở mái ấm có thật nhiều niềm vui, luôn hồn nhiên cười vui vẻ!",
      "Thế giới này tuyệt vời hơn rất nhiều nhờ sự kiên định hồn nhiên của các em."
    ];
    const randomNames = ["Người giấu tên", "Ân nhân", "Bạn trẻ FPT", "Nhà hảo tâm", "Mạnh thường quân"];

    wishCanvas.addEventListener('click', (e) => {
      // Don't trigger if clicked on an active star
      if (activeStar) return;
      
      const rect = wishCanvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      
      const randName = randomNames[Math.floor(Math.random() * randomNames.length)];
      const randWish = randomWishes[Math.floor(Math.random() * randomWishes.length)];
      const colors = ["#ffb703", "#00f5d4", "#a2d2ff", "#ff007f"];
      const randColor = colors[Math.floor(Math.random() * colors.length)];
      
      const px = cx / wishCanvas.width;
      const py = cy / wishCanvas.height;
      
      const newStar = new Star(px, py, randName, randWish, randColor, true);
      newStar.x = cx;
      newStar.y = cy;
      stars.push(newStar);
      
      // Draw ripple effect instantly
      ctx.shadowBlur = 10;
      ctx.shadowColor = randColor;
      ctx.strokeStyle = randColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    });
    
    // Function to add a brand new star programmatically (from Form)
    window.addNewStarToConstellation = async function(author, text, color, customPx = null, customPy = null) {
      const px = customPx !== null ? customPx : (Math.random() * 0.7 + 0.15);
      const py = customPy !== null ? customPy : (Math.random() * 0.6 + 0.2);
      
      // Save and sync globally
      await addStarToDatabase(author, text, color, px, py, true);
      
      // Scroll smoothly to Constellation sky tab
      if (window.navigateToTab) {
        window.navigateToTab('#constellation');
      }
    };
  }


  /* ==========================================================================
     EMPATHY SIMULATOR MODULE (INNOVATION!)
     ========================================================================== */
  const simTextContainer = document.getElementById('sim-text-container');
  const simScreen = document.getElementById('sim-screen');
  const simTextTarget = document.getElementById('sim-text-target');
  const simStatusMsg = document.getElementById('sim-status-msg');
  const deafnessCanvas = document.getElementById('deafness-canvas');
  
  const originalSimText = "Chào mừng bạn đến với Trạm Chạm Ánh Sao. Tại đây, sự chia sẻ bắt nguồn từ sự thấu cảm chân thành nhất. Hãy cùng chung tay dệt nên hy vọng cho tương lai của các em nhỏ.";
  
  let currentSimMode = null;
  let dyslexiaInterval = null;
  let deafnessAnimationId = null;

  // Select simulator buttons
  const simBtnDyslexia = document.getElementById('btn-dyslexia');
  const simBtnBlindness = document.getElementById('btn-blindness');
  const simBtnDeafness = document.getElementById('btn-deafness');
  const simBtnReset = document.getElementById('btn-reset-sim');
  
  // Clear simulator modes
  function clearAllSimulators() {
    // Reset buttons UI
    document.querySelectorAll('.sim-btn').forEach(b => b.classList.remove('active'));
    
    // Clear Dyslexia Mode
    if (dyslexiaInterval) {
      clearInterval(dyslexiaInterval);
      dyslexiaInterval = null;
    }
    
    // Clear Blindness Mode
    document.body.classList.remove('blindness-active');
    const existingLens = document.querySelector('.blind-magnifier');
    if (existingLens) existingLens.remove();
    simScreen.removeEventListener('mousemove', handleBlindnessMove);
    simScreen.removeEventListener('mouseenter', showBlindnessLens);
    simScreen.removeEventListener('mouseleave', hideBlindnessLens);
    
    // Clear Deafness Mode
    simScreen.classList.remove('deafness-active');
    if (deafnessAnimationId) {
      cancelAnimationFrame(deafnessAnimationId);
      deafnessAnimationId = null;
    }
    deafnessCanvas.style.display = 'none';
    
    // Restore text content
    simTextTarget.innerHTML = originalSimText;
    simStatusMsg.textContent = "Bộ giả lập đã tắt. Hãy chọn một chế độ trải nghiệm.";
    currentSimMode = null;
  }

  // --- DYSLEXIA SIMULATOR LOGIC ---
  function initDyslexiaSimulator() {
    clearAllSimulators();
    currentSimMode = 'dyslexia';
    simBtnDyslexia.classList.add('active');
    simStatusMsg.textContent = "Đang kích hoạt giả lập chứng Khó Đọc (Dyslexia)...";
    
    // Function to scramble middle letters of a word
    function scrambleWord(word) {
      if (word.length <= 3) return word;
      
      const first = word[0];
      const last = word[word.length - 1];
      const middle = word.slice(1, -1).split('');
      
      // Shuffle middle letters
      for (let i = middle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [middle[i], middle[j]] = [middle[j], middle[i]];
      }
      
      return first + middle.join('') + last;
    }
    
    function updateScrambledText() {
      // Split text by spaces but preserve punctuation
      const words = originalSimText.split(' ');
      const scrambledWords = words.map(w => {
        // Separate punctuation from word
        const cleanWord = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        const punctuation = w.slice(cleanWord.length);
        
        const scrambled = scrambleWord(cleanWord);
        return `<span class="dyslexia-word">${scrambled}${punctuation}</span>`;
      });
      
      simTextTarget.innerHTML = scrambledWords.join(' ');
    }
    
    // Run text scrambling every 800ms
    updateScrambledText();
    dyslexiaInterval = setInterval(updateScrambledText, 850);
  }

  // --- BLINDNESS SIMULATOR LOGIC (PREMIUM Spot Light Clip-Path) ---
  let blindnessLens = null;
  
  function handleBlindnessMove(e) {
    if (!blindnessLens) return;
    const rect = simScreen.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Position lens spotlight
    blindnessLens.style.left = `${x - 60}px`;
    blindnessLens.style.top = `${y - 60}px`;
    
    // Dynamic clip path centered at mouse coordinates on unblurred text
    const textTargetUnblurred = document.getElementById('sim-text-unblurred');
    if (textTargetUnblurred) {
      textTargetUnblurred.style.clipPath = `circle(60px at ${x}px ${y}px)`;
      textTargetUnblurred.style.webkitClipPath = `circle(60px at ${x}px ${y}px)`;
    }
  }
  
  function showBlindnessLens() {
    if (blindnessLens) {
      blindnessLens.style.display = 'block';
      const textTargetUnblurred = document.getElementById('sim-text-unblurred');
      if (textTargetUnblurred) textTargetUnblurred.style.opacity = '1';
    }
  }
  
  function hideBlindnessLens() {
    if (blindnessLens) {
      blindnessLens.style.display = 'none';
      const textTargetUnblurred = document.getElementById('sim-text-unblurred');
      if (textTargetUnblurred) textTargetUnblurred.style.opacity = '0';
    }
  }

  function initBlindnessSimulator() {
    clearAllSimulators();
    currentSimMode = 'blindness';
    simBtnBlindness.classList.add('active');
    simStatusMsg.textContent = "Đang giả lập Nhược Thị (Blur Vision). Di chuột qua ô để rọi rõ tiêu điểm.";
    
    // Apply body filter
    document.body.classList.add('blindness-active');
    
    // Create dual containers: 1 blurred background, 1 absolutely overlayed crisp container
    simTextTarget.innerHTML = `
      <div id="sim-text-blurred" style="color: rgba(255,255,255,0.7);">${originalSimText}</div>
      <div id="sim-text-unblurred" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; color: var(--secondary); font-weight: 700; pointer-events: none; opacity: 0; transition: opacity 0.2s; clip-path: circle(0px at 0px 0px); display: flex; align-items: center; justify-content: center; text-align: center; padding: 0 10%; box-sizing: border-box;">
        ${originalSimText}
      </div>
    `;
    
    // Create Magnifier Ring element
    blindnessLens = document.createElement('div');
    blindnessLens.className = 'blind-magnifier';
    simScreen.appendChild(blindnessLens);
    
    // Event listeners
    simScreen.addEventListener('mousemove', handleBlindnessMove);
    simScreen.addEventListener('mouseenter', showBlindnessLens);
    simScreen.addEventListener('mouseleave', hideBlindnessLens);
  }

  // --- DEAFNESS SIMULATOR LOGIC (RIPPLE WAVE VISUALIZER) ---
  function initDeafnessSimulator() {
    clearAllSimulators();
    currentSimMode = 'deafness';
    simBtnDeafness.classList.add('active');
    simScreen.classList.add('deafness-active');
    simStatusMsg.textContent = "Môi trường tĩnh lặng. Nhịp đập trái tim và sóng rung động đại diện cho cảm xúc của bé.";
    
    deafnessCanvas.style.display = 'block';
    deafnessCanvas.width = simScreen.clientWidth;
    deafnessCanvas.height = simScreen.clientHeight;
    
    const waveCtx = deafnessCanvas.getContext('2d');
    let angle = 0;
    
    function drawDeafnessWave() {
      if (currentSimMode !== 'deafness') return;
      
      waveCtx.clearRect(0, 0, deafnessCanvas.width, deafnessCanvas.height);
      waveCtx.strokeStyle = 'rgba(0, 245, 212, 0.4)';
      waveCtx.lineWidth = 2.5;
      
      // Simple heartbeat style visualizer wave
      waveCtx.beginPath();
      for (let x = 0; x < deafnessCanvas.width; x++) {
        // Standard sine wave with complex fluctuations
        const y = deafnessCanvas.height / 2 + 
                  Math.sin(x * 0.01 + angle) * 20 * Math.sin(x * 0.002 + angle * 0.5) +
                  Math.cos(x * 0.03 + angle * 2) * 5;
                  
        if (x === 0) waveCtx.moveTo(x, y);
        else waveCtx.lineTo(x, y);
      }
      waveCtx.stroke();
      
      angle += 0.02;
      deafnessAnimationId = requestAnimationFrame(drawDeafnessWave);
    }
    
    drawDeafnessWave();
  }

  // Hook simulator buttons
  if (simBtnDyslexia) simBtnDyslexia.addEventListener('click', initDyslexiaSimulator);
  if (simBtnBlindness) simBtnBlindness.addEventListener('click', initBlindnessSimulator);
  if (simBtnDeafness) simBtnDeafness.addEventListener('click', initDeafnessSimulator);
  if (simBtnReset) simBtnReset.addEventListener('click', clearAllSimulators);


  /* ==========================================================================
     STATION 3: WISHING FORM SUBMISSION
     ========================================================================== */
  const wishForm = document.getElementById('wishing-form');
  if (wishForm) {
    wishForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const authorVal = document.getElementById('wish-author').value.trim();
      const textVal = document.getElementById('wish-text').value.trim();
      
      // Get selected color
      const selectedColorInput = document.querySelector('input[name="star-color"]:checked');
      const starColor = selectedColorInput ? selectedColorInput.value : "#ffb703";
      
      if (authorVal === "" || textVal === "") return;
      
      // Trigger canvas star birth animation
      if (window.addNewStarToConstellation) {
        window.addNewStarToConstellation(authorVal, textVal, starColor);
        
        // Show success animation
        triggerConfettiShower();
        
        // Reset form
        wishForm.reset();
        
        // Custom simple alerting toast
        showTemporaryToast("Chúc mừng! Lời chúc của bạn đã kết thành ngôi sao sáng.");
      }
    });
  }

  // Toast Notification
  function showTemporaryToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'glass';
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.right = '30px';
    toast.style.padding = '16px 28px';
    toast.style.borderRadius = '50px';
    toast.style.color = 'var(--secondary)';
    toast.style.fontWeight = '600';
    toast.style.border = '1px solid var(--secondary)';
    toast.style.boxShadow = '0 10px 30px rgba(0, 245, 212, 0.2)';
    toast.style.zIndex = '999';
    toast.textContent = msg;
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }


  /* ==========================================================================
     VIRTUAL SOUVENIR CART & PROGRESS SYSTEM (INNOVATION 3)
     ========================================================================== */
  let cart = [];
  let customDonationAmount = 0;
  
  // DOM Cache
  const cartBtn = document.getElementById('cart-btn');
  const cartPanel = document.getElementById('cart-panel');
  const cartClose = document.getElementById('cart-close');
  const cartOverlay = document.getElementById('cart-overlay');
  
  const cartCountEl = document.getElementById('cart-count');
  const cartItemsContainer = document.getElementById('cart-items-container');
  
  const cartSubtotalEl = document.getElementById('cart-subtotal');
  const cartExtraDonateEl = document.getElementById('cart-extra-donate');
  const cartTotalEl = document.getElementById('cart-total');
  
  const checkoutBtn = document.getElementById('btn-checkout');
  const checkoutDialog = document.getElementById('checkout-dialog');
  const checkoutSuccessMsg = document.getElementById('checkout-success-msg');
  const closeDialogBtn = document.getElementById('btn-close-dialog');
  
  // Custom donation DOMs
  const btnCustomDonate = document.getElementById('btn-custom-donate');
  const customDonationInput = document.getElementById('custom-donation-amount');
  const quickDonationBtns = document.querySelectorAll('.quick-donation-btn');

  // Toggle Cart sliding panel
  function openCart() { cartPanel.classList.add('open'); }
  function closeCart() { cartPanel.classList.remove('open'); }
  
  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // Quick donation values clicks
  quickDonationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      quickDonationBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      customDonationInput.value = btn.dataset.val;
    });
  });

  // Direct Donate button
  if (btnCustomDonate) {
    btnCustomDonate.addEventListener('click', () => {
      const val = parseInt(customDonationInput.value);
      if (isNaN(val) || val < 10000) {
        alert("Vui lòng ủng hộ tối thiểu 10.000đ");
        return;
      }
      
      customDonationAmount = val;
      updateCartTotals();
      openCart();
      
      // Clear quick inputs
      customDonationInput.value = "";
      quickDonationBtns.forEach(b => b.classList.remove('active'));
      
      showTemporaryToast(`Đã thêm số tiền quyên góp ${formatMoney(val)} vào giỏ hàng.`);
    });
  }

  // Load shop product cards click listeners
  const addCartButtons = document.querySelectorAll('.btn-add-cart');
  addCartButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.product-card');
      const id = card.dataset.id;
      const name = card.dataset.name;
      const price = parseInt(card.dataset.price);
      
      // Add to array
      const existing = cart.find(item => item.id === id);
      if (existing) {
        existing.qty++;
      } else {
        cart.push({ id, name, price, qty: 1 });
      }
      
      renderCartItems();
      updateCartTotals();
      openCart();
    });
  });

  // Money Formatting
  function formatMoney(amount) {
    return amount.toLocaleString('vi-VN') + ' đ';
  }

  // Render items inside mini-cart wrapper
  function renderCartItems() {
    cartItemsContainer.innerHTML = "";
    
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `<div class="cart-empty-message">Giỏ hàng của bạn đang trống. Hãy chọn những món quà lưu niệm để dệt thêm ánh sáng nhé!</div>`;
      return;
    }
    
    cart.forEach(item => {
      // Map SVG preview based on item ID
      let iconSvg = '';
      if (item.id === 'p1') {
        iconSvg = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;color:#7209b7;"><circle cx="50" cy="50" r="30" fill="rgba(114, 9, 183, 0.15)"></circle><polygon points="50,30 52,36 58,37 53,41 55,47 50,44 45,47 47,41 42,37 48,36" fill="#ffb703"></polygon></svg>`;
      } else if (item.id === 'p2') {
        iconSvg = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;color:#4361ee;"><rect x="30" y="20" width="40" height="60" rx="3" fill="#4361ee"></rect><polygon points="50,45 52,49 57,50 53,53 54,58 50,56 46,58 47,53 43,50 48,49" fill="#00f5d4"></polygon></svg>`;
      } else {
        iconSvg = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;color:#00f5d4;"><circle cx="50" cy="50" r="16" fill="rgba(0, 245, 212, 0.2)" stroke="#00f5d4" stroke-width="2"></circle><polygon points="50,42 52,46 57,47 53,50 54,55 50,53 46,55 47,50 43,47 48,46" fill="#ffb703"></polygon></svg>`;
      }
      
      const itemNode = document.createElement('div');
      itemNode.className = 'cart-item-card';
      itemNode.innerHTML = `
        <div class="cart-item-img">${iconSvg}</div>
        <div class="cart-item-detail">
          <h4>${item.name}</h4>
          <span class="cart-item-price">${formatMoney(item.price)}</span>
        </div>
        <div class="cart-item-controls">
          <div class="cart-item-quantity">
            <button class="qty-btn btn-qty-down" data-id="${item.id}">-</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn btn-qty-up" data-id="${item.id}">+</button>
          </div>
          <button class="btn-remove-item" data-id="${item.id}">Xóa</button>
        </div>
      `;
      
      cartItemsContainer.appendChild(itemNode);
    });

    // Wire listeners for dynamic quantity buttons
    cartItemsContainer.querySelectorAll('.btn-qty-up').forEach(b => {
      b.addEventListener('click', () => {
        const item = cart.find(i => i.id === b.dataset.id);
        if (item) {
          item.qty++;
          renderCartItems();
          updateCartTotals();
        }
      });
    });

    cartItemsContainer.querySelectorAll('.btn-qty-down').forEach(b => {
      b.addEventListener('click', () => {
        const item = cart.find(i => i.id === b.dataset.id);
        if (item) {
          item.qty--;
          if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== item.id);
          }
          renderCartItems();
          updateCartTotals();
        }
      });
    });

    cartItemsContainer.querySelectorAll('.btn-remove-item').forEach(b => {
      b.addEventListener('click', () => {
        cart = cart.filter(i => i.id !== b.dataset.id);
        renderCartItems();
        updateCartTotals();
      });
    });
  }

  // Compute and show totals
  function updateCartTotals() {
    let subtotal = 0;
    let itemsCount = 0;
    
    cart.forEach(item => {
      subtotal += item.price * item.qty;
      itemsCount += item.qty;
    });
    
    const total = subtotal + customDonationAmount;
    
    // Updates UI
    cartCountEl.textContent = itemsCount;
    cartCountEl.style.display = itemsCount > 0 ? 'flex' : 'none';
    
    cartSubtotalEl.textContent = formatMoney(subtotal);
    cartExtraDonateEl.textContent = formatMoney(customDonationAmount);
    cartTotalEl.textContent = formatMoney(total);
  }

  // Trigger simulated successful Checkout
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
      const totalContribution = subtotal + customDonationAmount;
      
      if (totalContribution <= 0) {
        alert("Giỏ đóng góp của bạn đang trống! Hãy chọn lưu niệm hoặc ủng hộ tùy chọn.");
        return;
      }
      
      // Update checkout dialog content
      checkoutSuccessMsg.innerHTML = `Bạn đã tài trợ quyên góp thành công <strong>${formatMoney(totalContribution)}</strong> ủng hộ chiến dịch. Một ngôi sao vàng dạ quang khổng lồ của bạn đã được chắp cánh dệt thẳng lên Bầu Trời Hy Vọng!`;
      
      // Spawn massive user donation star
      if (window.addNewStarToConstellation) {
        window.addNewStarToConstellation("Ủng Hộ Viên Hào Tâm", `Đã tài trợ ${formatMoney(totalContribution)} gửi trọn yêu thương cho các em.`, "#ffb703");
      }
      
      // Close side-cart, open Dialog
      closeCart();
      checkoutDialog.classList.add('open');
      
      // Trigger gorgeous AI custom particles
      triggerConfettiShower();
      
      // Dynamically add to fundraising progress values
      increaseFundraiserProgress(totalContribution);
      
      // Clear Cart
      cart = [];
      customDonationAmount = 0;
      renderCartItems();
      updateCartTotals();
    });
  }

  // Close Checkout success overlay Dialog
  if (closeDialogBtn) {
    closeDialogBtn.addEventListener('click', () => {
      checkoutDialog.classList.remove('open');
    });
  }

  // Dynamically update donation progress bar values and fills
  function increaseFundraiserProgress(addAmt) {
    const currentFundsEl = document.getElementById('current-funds');
    const progressBarFill = document.getElementById('progress-bar-fill');
    
    const currentRaw = parseInt(currentFundsEl.textContent.replace(/[^0-9]/g, ""));
    const newRaw = Math.min(30000000, currentRaw + addAmt);
    
    currentFundsEl.textContent = formatMoney(newRaw);
    
    // Recalculate progress fill %
    const percentage = (newRaw / 30000000) * 100;
    progressBarFill.style.width = `${percentage}%`;
  }


  /* ==========================================================================
     CONFETTI PARTICLE SYSTEM (CELEBRATIVE IMPACT)
     ========================================================================== */
  function triggerConfettiShower() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    
    const colors = ['#7209b7', '#00f5d4', '#ffb703', '#4361ee', '#ff007f'];
    
    for (let i = 0; i < 70; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      
      // Random coordinates
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Random sizes
      const w = Math.random() * 8 + 6;
      confetti.style.width = `${w}px`;
      confetti.style.height = `${Math.random() * 12 + 6}px`;
      
      // Random timing & delays
      confetti.style.animationDelay = `${Math.random() * 0.8}s`;
      confetti.style.animationDuration = `${Math.random() * 2 + 2}s`;
      
      container.appendChild(confetti);
      
      // Cleanup DOM
      setTimeout(() => confetti.remove(), 4000);
    }
  }

});
