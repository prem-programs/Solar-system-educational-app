class GooeyNav {
  constructor(containerId, options) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.options = {
      animationTime: 600,
      particleCount: 15,
      particleDistances: [90, 10],
      particleR: 100,
      timeVariance: 300,
      colors: [1, 2, 3, 4, 5, 6, 7, 8],
      initialActiveIndex: -1, // Wait for user choice, or default to 0
      ...options
    };
    this.items = this.options.items || [];
    this.activeIndex = this.options.initialActiveIndex;
    this.onSelect = this.options.onSelect || (() => {});
    
    this.setupDOM();
    this.bindEvents();
    
    // Initial effect setup
    setTimeout(() => {
      if (this.activeIndex >= 0 && this.listItems[this.activeIndex]) {
        this.updateEffectPosition(this.listItems[this.activeIndex]);
        this.textRef.classList.add('active');
      }
    }, 100);

    const resizeObserver = new ResizeObserver(() => {
      if (this.activeIndex >= 0 && this.listItems[this.activeIndex]) {
        this.updateEffectPosition(this.listItems[this.activeIndex]);
      }
    });
    resizeObserver.observe(this.container);
  }

  setupDOM() {
    this.container.classList.add('gooey-nav-container');
    
    const nav = document.createElement('nav');
    const ul = document.createElement('ul');
    this.navRef = ul;

    this.listItems = [];
    
    this.items.forEach((item, index) => {
      const li = document.createElement('li');
      if (index === this.activeIndex) li.classList.add('active');
      
      const a = document.createElement('a');
      a.href = item.href || '#';
      a.innerText = item.label;
      a.dataset.index = index;
      if (item.target) a.dataset.target = item.target; // specific for planet target
      
      li.appendChild(a);
      ul.appendChild(li);
      this.listItems.push(li);
    });

    nav.appendChild(ul);
    this.container.appendChild(nav);

    this.filterRef = document.createElement('span');
    this.filterRef.className = 'effect filter';
    this.container.appendChild(this.filterRef);

    this.textRef = document.createElement('span');
    this.textRef.className = 'effect text';
    this.container.appendChild(this.textRef);
  }

  noise(n = 1) {
    return n / 2 - Math.random() * n;
  }

  getXY(distance, pointIndex, totalPoints) {
    const angle = ((360 + this.noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  }

  createParticle(i, t, d, r) {
    let rotate = this.noise(r / 10);
    return {
      start: this.getXY(d[0], this.options.particleCount - i, this.options.particleCount),
      end: this.getXY(d[1] + this.noise(7), this.options.particleCount - i, this.options.particleCount),
      time: t,
      scale: 1 + this.noise(0.2),
      color: this.options.colors[Math.floor(Math.random() * this.options.colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  }

  makeParticles(element) {
    const d = this.options.particleDistances;
    const r = this.options.particleR;
    const bubbleTime = this.options.animationTime * 2 + this.options.timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);

    for (let i = 0; i < this.options.particleCount; i++) {
      const t = this.options.animationTime * 2 + this.noise(this.options.timeVariance * 2);
      const p = this.createParticle(i, t, d, r);
      element.classList.remove('active');

      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);

        point.classList.add('point');
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => {
          element.classList.add('active');
        });
        setTimeout(() => {
          try {
            element.removeChild(particle);
          } catch {
            // Do nothing
          }
        }, t);
      }, 30);
    }
  }

  updateEffectPosition(element) {
    if (!this.container || !this.filterRef || !this.textRef) return;
    const containerRect = this.container.getBoundingClientRect();
    const pos = element.getBoundingClientRect();

    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };
    
    for (const [key, value] of Object.entries(styles)) {
      this.filterRef.style[key] = value;
      this.textRef.style[key] = value;
    }
    this.textRef.innerText = element.innerText;
  }

  bindEvents() {
    this.listItems.forEach((li, index) => {
      const a = li.querySelector('a');
      
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleClick(li, index);
      });
      
      a.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleClick(li, index);
        }
      });
    });
  }

  selectItemByIndex(index) {
    if (index >= 0 && index < this.listItems.length) {
      this.handleClick(this.listItems[index], index, false);
    }
  }

  handleClick(liEl, index, triggerCallback = true) {
    if (this.activeIndex === index) return;

    if (this.activeIndex >= 0 && this.listItems[this.activeIndex]) {
      this.listItems[this.activeIndex].classList.remove('active');
    }
    liEl.classList.add('active');
    this.activeIndex = index;
    
    this.updateEffectPosition(liEl);

    if (this.filterRef) {
      const particles = this.filterRef.querySelectorAll('.particle');
      particles.forEach(p => this.filterRef.removeChild(p));
    }

    if (this.textRef) {
      this.textRef.classList.remove('active');
      void this.textRef.offsetWidth; // trigger reflow
      this.textRef.classList.add('active');
    }

    if (this.filterRef) {
      this.makeParticles(this.filterRef);
    }

    if (triggerCallback) {
      this.onSelect(this.items[index], index);
    }
  }
}
