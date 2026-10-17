<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon">$</div>
        <span>Meu Financeiro</span>
      </div>

      <nav class="navigation">
        <p class="nav-label">MENU PRINCIPAL</p>

        <RouterLink to="/" class="nav-link">
          <span class="nav-icon">⌂</span>
          Dashboard
        </RouterLink>

        <RouterLink to="/about" class="nav-link">
          <span class="nav-icon">↔</span>
          Lançamentos
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <span class="status-dot"></span>
        Seu dinheiro sob controle
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <div>
          <p class="greeting">ORGANIZAÇÃO FINANCEIRA</p>
          <h1>Meu espaço financeiro</h1>
        </div>

        <div class="profile">
          <div class="profile-avatar">E</div>
          <span>Minha conta</span>
        </div>
      </header>

      <section class="page-content">
        <RouterView />
      </section>
    </main>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

:root {
  font-family: 'DM Sans', sans-serif;
  color: #24332c;
  background: #f6f8f6;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-optical-sizing: auto;
  font-weight: 400;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select {
  font: inherit;
}

.layout {
  min-height: 100vh;
}

.sidebar {
  width: 250px;
  position: fixed;
  inset: 0 auto 0 0;
  display: flex;
  flex-direction: column;
  padding: 32px 20px 24px;
  background: #ffffff;
  border-right: 1px solid #e8ede9;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.6px;
}

.brand-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 12px;
  background: #246b4a;
  color: white;
  font-size: 24px;
  font-weight: 700;
}

.navigation {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 56px;
}

.nav-label,
.greeting {
  margin: 0;
  color: #87938b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.3px;
}

.nav-label {
  padding: 0 12px;
  margin-bottom: 12px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 12px;
  border-radius: 10px;
  color: #66736a;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;
}

.nav-link:hover,
.nav-link.router-link-exact-active {
  background: #edf5ef;
  color: #246b4a;
}

.nav-icon {
  width: 22px;
  font-size: 21px;
  text-align: center;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: auto;
  padding: 16px 8px 0;
  color: #87938b;
  font-size: 11px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #58a778;
}

.main-content {
  min-height: 100vh;
  margin-left: 250px;
  padding: 0 40px 40px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 32px 0;
  border-bottom: 1px solid #e8ede9;
}

.greeting {
  margin-bottom: 8px;
}

.topbar h1 {
  margin: 0;
  font-family: 'Manrope', sans-serif;
  font-size: 25px;
  font-weight: 800;
  letter-spacing: -1px;
}

.profile {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #59665d;
  font-size: 13px;
  font-weight: 600;
}

.profile-avatar {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 50%;
  background: #dcece0;
  color: #246b4a;
  font-weight: 700;
}

.page-content {
  padding-top: 32px;
}

@media (max-width: 760px) {
  .sidebar {
    position: static;
    width: 100%;
    padding: 18px;
    border-right: 0;
    border-bottom: 1px solid #e8ede9;
  }

  .navigation {
    margin-top: 24px;
  }

  .sidebar-footer {
    display: none;
  }

  .main-content {
    margin-left: 0;
    padding: 0 20px 28px;
  }

  .topbar {
    align-items: flex-start;
    padding: 24px 0;
  }

  .topbar h1 {
    font-size: 20px;
  }

  .profile span {
    display: none;
  }
}
</style>
