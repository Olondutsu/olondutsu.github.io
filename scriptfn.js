window.onload = () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  
    const scoreboard = document.getElementById("scoreboard");
    const messages = document.getElementById("messages");
  
    const fruitTypes = ["apple", "banana", "pear"];
    const fruitImages = {};
    const collected = { apple: 0, banana: 0, pear: 0 };
    let fruits = [];
    let draggedFruit = null;
    let combo = 1;
    let comboCount = 0;
    let totalCollected = 0;
    let fallSpeed = 2;
    let compliments = ["Nice!", "Super!", "Bravo!", "🔥🔥🔥", "Ale kozacko!", "Champion!", "Perfecto!"];
  
    const backpack = {
      x: canvas.width - 120,
      y: canvas.height - 120,
      width: 100,
      height: 100,
      img: new Image()
    };
    backpack.img.src = "images/backpack.png";
  
    // Load fruit images
    fruitTypes.forEach(type => {
      const img = new Image();
      img.src = `images/${type}.png`;
      fruitImages[type] = img;
    });
  
    function spawnFruit() {
      const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
      const img = fruitImages[type];
      if (!img.complete) return; // wait for image to load
  
      const fruit = {
        type,
        x: Math.random() * (canvas.width - 60),
        y: -60,
        width: 50,
        height: 50,
        vx: 0,
        vy: fallSpeed,
        img,
        collected: false
      };
      fruits.push(fruit);
    }
  
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // Debug: draw a test square
      ctx.fillStyle = "black";
      ctx.fillRect(50, 50, 100, 100); // visible test box
  
      // Draw backpack
      ctx.drawImage(backpack.img, backpack.x, backpack.y, backpack.width, backpack.height);
  
      // Draw fruits
      fruits.forEach(fruit => {
        ctx.drawImage(fruit.img, fruit.x, fruit.y, fruit.width, fruit.height);
      });
    }
  
    function update() {
      fruits.forEach(fruit => {
        if (fruit !== draggedFruit) fruit.y += fruit.vy;
      });
  
      for (let i = fruits.length - 1; i >= 0; i--) {
        const fruit = fruits[i];
        if (fruit.y > canvas.height + 30) {
          fruits.splice(i, 1);
          showMessage("KURWA", "red");
          combo = 1;
          comboCount = 0;
        }
      }
    }
  
    function showMessage(text, color) {
      const el = document.createElement("div");
      el.innerText = text;
      el.style.color = color;
      el.style.animation = "fadeOut 2s ease forwards";
      el.style.position = "absolute";
      el.style.top = "50px";
      el.style.width = "100%";
      el.style.textAlign = "center";
      el.style.fontSize = "40px";
      el.style.fontWeight = "bold";
      messages.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }
  
    function showFloatingScore(x, y, amount) {
      const el = document.createElement("div");
      el.innerText = `+${amount}`;
      el.style.color = "green";
      el.style.position = "absolute";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.fontSize = "20px";
      el.style.fontWeight = "bold";
      el.style.animation = "floatUp 1s ease-out forwards";
      messages.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }
  
    function updateScoreboard() {
      scoreboard.innerText = `🍎 ${collected.apple} 🍌 ${collected.banana} 🍐 ${collected.pear} | Combo x${combo}`;
    }
  
    function gameLoop() {
      update();
      draw();
      updateScoreboard();
      requestAnimationFrame(gameLoop);
    }
  
    setInterval(spawnFruit, 1200);
  
    canvas.addEventListener("mousedown", e => {
      const mx = e.offsetX;
      const my = e.offsetY;
      draggedFruit = fruits.find(fruit =>
        mx >= fruit.x &&
        mx <= fruit.x + fruit.width &&
        my >= fruit.y &&
        my <= fruit.y + fruit.height
      );
    });
  
    canvas.addEventListener("mousemove", e => {
      if (draggedFruit) {
        draggedFruit.x = e.offsetX - draggedFruit.width / 2;
        draggedFruit.y = e.offsetY - draggedFruit.height / 2;
      }
    });
  
    canvas.addEventListener("mouseup", () => {
      if (draggedFruit) {
        const f = draggedFruit;
        if (
          f.x + f.width > backpack.x &&
          f.x < backpack.x + backpack.width &&
          f.y + f.height > backpack.y &&
          f.y < backpack.y + backpack.height
        ) {
          collected[f.type]++;
          comboCount++;
          totalCollected++;
  
          combo = Math.min(10, Math.floor(comboCount / 2) + 1);
          showFloatingScore(f.x, f.y, combo);
  
          if (comboCount % 2 === 0 && combo > 1) {
            const compliment = compliments[Math.floor(Math.random() * compliments.length)];
            showMessage(compliment, "green");
          }
  
          if (totalCollected % 10 === 0) {
            fallSpeed += 0.5;
          }
  
          fruits = fruits.filter(fruit => fruit !== f);
        }
        draggedFruit = null;
      }
    });
  
    gameLoop();
  };