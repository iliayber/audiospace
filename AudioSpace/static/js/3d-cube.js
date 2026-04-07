// ============================================
// РЕАЛИСТИЧНЫЙ 3D-КУБ С ТЕНЯМИ И ОТРАЖЕНИЯМИ
// ============================================

import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js';

// Ждём полной загрузки страницы
window.addEventListener('DOMContentLoaded', function() {
    
    const canvas = document.getElementById('cubeCanvas');
    const preloader = document.getElementById('preloader');
    
    if (!canvas || !preloader) return;
    
    // === НАСТРОЙКИ СЦЕНЫ ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.008); // Туман для глубины
    
    // === КАМЕРА ===
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(3, 2, 5);
    camera.lookAt(0, 0, 0);
    
    // === РЕНДЕРЕР С ПРОЗРАЧНОСТЬЮ ===
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
    renderer.setSize(250, 250);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true; // Включаем тени
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Мягкие тени
    
    // === ОСВЕЩЕНИЕ ===
    
    // Основной свет (спереди)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(2, 3, 4);
    mainLight.castShadow = true;
    mainLight.receiveShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);
    
    // Заполняющий свет (сзади)
    const backLight = new THREE.DirectionalLight(0x4466ff, 0.5);
    backLight.position.set(-2, 1, -3);
    scene.add(backLight);
    
    // Розовый акцентный свет (сбоку)
    const accentLight = new THREE.PointLight(0xff44aa, 0.4);
    accentLight.position.set(2, 1, 2);
    scene.add(accentLight);
    
    // Синий акцентный свет (с другой стороны)
    const accentLight2 = new THREE.PointLight(0x44aaff, 0.4);
    accentLight2.position.set(-2, 1, 2);
    scene.add(accentLight2);
    
    // Мягкий свет снизу
    const fillLight = new THREE.PointLight(0x88aaff, 0.3);
    fillLight.position.set(0, -2, 0);
    scene.add(fillLight);
    
    // === ПЫЛЬ/ЧАСТИЦЫ В ВОЗДУХЕ ===
    const particleCount = 800;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        particlesPositions[i * 3] = (Math.random() - 0.5) * 20;
        particlesPositions[i * 3 + 1] = (Math.random() - 0.5) * 15;
        particlesPositions[i * 3 + 2] = (Math.random() - 0.5) * 15 - 5;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPositions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        color: 0x88aaff,
        size: 0.03,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    
    // === СОЗДАЁМ ТЕКСТУРУ ДЛЯ ГРАНЕЙ КУБА ===
    const createFaceTexture = (icon, bgColor, iconColor) => {
        const canvasTex = document.createElement('canvas');
        canvasTex.width = 1024;
        canvasTex.height = 1024;
        const ctx = canvasTex.getContext('2d');
        
        // Градиентный фон
        const grad = ctx.createLinearGradient(0, 0, canvasTex.width, canvasTex.height);
        grad.addColorStop(0, bgColor);
        grad.addColorStop(1, '#0a0a2a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasTex.width, canvasTex.height);
        
        // Свечение по краям
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 15;
        ctx.strokeRect(20, 20, canvasTex.width - 40, canvasTex.height - 40);
        
        // Рисуем иконку
        ctx.fillStyle = iconColor;
        ctx.font = `Bold ${canvasTex.width * 0.4}px "Segoe UI Emoji"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, canvasTex.width / 2, canvasTex.height / 2);
        
        // Глянцевый эффект
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, 0, canvasTex.width, canvasTex.height);
        
        const texture = new THREE.CanvasTexture(canvasTex);
        texture.needsUpdate = true;
        return texture;
    };
    
    // Цвета для разных граней
    const colors = ['#1db954', '#ff44aa', '#44aaff', '#ffaa44', '#aa44ff', '#44ffaa'];
    const icons = ['🎵', '🎧', '🎶', '🎤', '🎸', '🎹'];
    
    // Создаём материалы для каждой грани
    const materials = icons.map((icon, i) => {
        return new THREE.MeshStandardMaterial({
            map: createFaceTexture(icon, colors[i], '#ffffff'),
            roughness: 0.3,
            metalness: 0.7,
            emissive: new THREE.Color(colors[i]),
            emissiveIntensity: 0.15,
            flatShading: false
        });
    });
    
    // === СОЗДАЁМ КУБ ===
    const geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8);
    const cube = new THREE.Mesh(geometry, materials);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);
    
    // === ДОБАВЛЯЕМ СВЕЧЕНИЕ ВОКРУГ КУБА ===
    const glowGeometry = new THREE.SphereGeometry(1.1, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x1db954,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);
    
    // === ПОЛ (ОТРАЖЕНИЕ) ===
    const floorGeometry = new THREE.CircleGeometry(3, 32);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a2a,
        roughness: 0.4,
        metalness: 0.8,
        transparent: true,
        opacity: 0.5
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.1;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // === СВЕТЯЩИЕСЯ ТОЧКИ ВОКРУГ ===
    const orbs = [];
    const orbColors = [0x00ffff, 0xff44aa, 0x44ffaa, 0xffaa44];
    for (let i = 0; i < 12; i++) {
        const orbGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const orbMaterial = new THREE.MeshStandardMaterial({
            color: orbColors[i % orbColors.length],
            emissive: orbColors[i % orbColors.length],
            emissiveIntensity: 0.8
        });
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        const angle = (i / 12) * Math.PI * 2;
        const radius = 1.5;
        orb.position.set(Math.cos(angle) * radius, Math.sin(angle * 2) * 0.8, Math.sin(angle) * radius);
        orb.castShadow = true;
        scene.add(orb);
        orbs.push(orb);
    }
    
    // === ЗВЁЗДЫ НА ЗАДНЕМ ПЛАНЕ ===
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * 200;
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
        starPositions[i * 3 + 2] = (Math.random() - 0.5) * 80 - 30;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.08,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    
    // === АНИМАЦИЯ ===
    let time = 0;
    
    function animate() {
        requestAnimationFrame(animate);
        time += 0.008;
        
        // Вращение куба
        cube.rotation.x = Math.sin(time * 0.5) * 0.3;
        cube.rotation.y = time;
        cube.rotation.z = Math.cos(time * 0.5) * 0.2;
        
        // Пульсация свечения
        const intensity = 0.1 + Math.sin(time * 3) * 0.05;
        glowMaterial.opacity = 0.08 + Math.sin(time * 2) * 0.03;
        
        // Вращение частиц
        particles.rotation.y += 0.002;
        particles.rotation.x += 0.001;
        
        // Вращение звёзд
        stars.rotation.y += 0.0005;
        stars.rotation.x += 0.0003;
        
        // Движение светящихся точек
        orbs.forEach((orb, i) => {
            const angle = time * 1.5 + (i / orbs.length) * Math.PI * 2;
            const radius = 1.6;
            orb.position.x = Math.cos(angle) * radius;
            orb.position.z = Math.sin(angle) * radius;
            orb.position.y = Math.sin(angle * 2) * 0.5;
            
            // Пульсация размера
            const scale = 0.8 + Math.sin(time * 5 + i) * 0.3;
            orb.scale.set(scale, scale, scale);
        });
        
        // Мерцание акцентных светов
        accentLight.intensity = 0.4 + Math.sin(time * 2) * 0.15;
        accentLight2.intensity = 0.4 + Math.cos(time * 2.3) * 0.15;
        
        renderer.render(scene, camera);
    }
    
    animate();
    
    // === СКРЫВАЕМ ЭКРАН ЗАГРУЗКИ ===
    setTimeout(function() {
        preloader.classList.add('fade-out');
        setTimeout(function() {
            preloader.style.display = 'none';
        }, 1000);
    }, 3500);
    
    // === АДАПТАЦИЯ ПОД РАЗМЕР ===
    window.addEventListener('resize', () => {
        const size = Math.min(window.innerWidth * 0.3, 250);
        renderer.setSize(size, size);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
    });
});