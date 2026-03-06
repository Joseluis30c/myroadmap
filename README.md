# 🗺️ MyRoadMap
![Angular](https://img.shields.io/badge/Angular-21-red)
![TypeScript](https://img.shields.io/badge/TypeScript-Language-blue)
![Status](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-green)
![Frontend](https://img.shields.io/badge/Frontend-Web-orange)

Aplicación web desarrollada con **Angular** que permite visualizar y organizar un **roadmap de aprendizaje o desarrollo**, mostrando de forma clara los pasos, tecnologías y objetivos que se desean alcanzar.
---
# 📚 Tabla de Contenido

- Descripción
- Objetivo del proyecto
- Tecnologías utilizadas
- Funcionalidades
- Estructura del proyecto
- Cómo ejecutar el proyecto
- Ejemplo de código
- Mejoras futuras
- Autor
- Apoya el proyecto

---
# 🧠 Descripcion

**MyRoadMap** es una aplicación web desarrollada con **Angular** que permite crear y visualizar un **roadmap de aprendizaje o desarrollo profesional**.

El objetivo es mostrar de manera organizada los diferentes pasos o tecnologías que forman parte de un plan de aprendizaje o desarrollo, facilitando el seguimiento del progreso y la planificación de nuevas metas.

Este tipo de herramientas es útil para:

- Planificar el aprendizaje de nuevas tecnologías
- Organizar objetivos profesionales
- Visualizar el progreso de desarrollo
- Compartir roadmaps con otros desarrolladores

---
# 🎯 Objetivo del proyecto

El proyecto tiene como objetivo principal:

- Crear una aplicación web moderna utilizando **Angular**
- Permitir visualizar un **roadmap de aprendizaje**
- Practicar arquitectura y estructura de proyectos frontend
- Servir como ejemplo educativo para desarrolladores que trabajan con Angular

También funciona como una herramienta para **organizar objetivos tecnológicos y profesionales**.

---
# 🧰 Tecnologias utilizadas

Las principales tecnologías utilizadas en el proyecto son:

- **Angular**
- **TypeScript**
- **HTML**
- **CSS**
- **Node.js**
- **Angular CLI**

Estas tecnologías permiten construir aplicaciones web modernas, rápidas y mantenibles.

---
# ⚙️ Funcionalidades

El proyecto incluye las siguientes funcionalidades:

✔ Visualización de un roadmap de aprendizaje  
✔ Organización de tecnologías por etapas  
✔ Interfaz web moderna desarrollada con Angular  
✔ Arquitectura basada en componentes  
✔ Fácil extensión para agregar nuevas secciones o tecnologías  

---
# 📁 Estructura del proyecto

    myroadmap/
    ├── src/
    |  ├──app/
    |  |  ├──components/
    |  |  ├──pages/
    |  |  ├──services/
    ├── angular.json
    ├── package.json
    └── README.md
------------------------------------------------------------------------

# 🚀 Como ejecutar el proyecto

### 1️⃣ Clonar el repositorio

``` bash
git clone https://github.com/Joseluis30c/myroadmap.git
```

### 2️⃣ Instalar dependencias
``` bash
 npm install
```

### 3️⃣ Ejecutar el proyecto
``` bash
 ng serve
```

### 4️⃣ Abrir en el navegador
``` bash
 http://localhost:4200
```
------------------------------------------------------------------------

# 💡 Ejemplo de código

Ejemplo simple de un componente en Angular:

``` typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-roadmap',
  template: `
    <h1>My Roadmap</h1>
    <ul>
      <li *ngFor="let item of roadmap">
        {{ item }}
      </li>
    </ul>
  `
})
export class RoadmapComponent {

  roadmap: string[] = [
    'HTML & CSS',
    'JavaScript',
    'Angular',
    'APIs',
    'Bases de datos'
  ];

}
```

------------------------------------------------------------------------

# 🚀 Mejoras futuras

Algunas mejoras que podrían agregarse al proyecto:

-   Diseño responsive mejorado
-   Integración con APIs para obtener roadmaps dinámicos
-   Persistencia de datos
-   Sistema de usuarios
------------------------------------------------------------------------

# 👨‍💻 Autor

**Jose Luis Chavesta Rivas**

GitHub\
https://github.com/Joseluis30c

------------------------------------------------------------------------

# ⭐ Apoya el proyecto

Si este proyecto te resulta útil o interesante:

⭐ Dale una estrella al repositorio en GitHub.
