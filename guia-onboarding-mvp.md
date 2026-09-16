# Guía del Proyecto: Stack Tecnológico y Metodología de Trabajo

> Esta guía está pensada para que cualquier persona del equipo, tenga o no experiencia técnica, entienda **qué herramientas usamos** y **cómo trabajamos juntos** sin generar caos en el código.

---

## 1. ¿Qué es un MVP?

Un MVP (Minimum Viable Product / Producto Mínimo Viable) es la versión más simple de nuestro producto que ya resuelve el problema principal para el que lo creamos. No busca tener todas las funciones posibles, sino las esenciales, funcionando bien, para poder mostrarlo, probarlo con usuarios reales y mejorarlo después.

---

## 2. El Stack Tecnológico (explicado sin jerga)

Piensa en el proyecto como si fuera un restaurante:

| Herramienta | Rol en el restaurante | Qué hace realmente |
|---|---|---|
| **Next.js** | La estructura del restaurante (cocina, salón, mesas) | El "motor" que arma las páginas web que ve el usuario. Es el framework principal. |
| **TypeScript** | El manual de recetas revisado por un chef experto | Es JavaScript (el lenguaje de programación) pero con reglas extra que avisan errores *antes* de que pasen, no después. |
| **Tailwind CSS** | El catálogo de decoración lista para usar | Sistema para darle estilo visual (colores, espacios, tamaños) rápido, sin escribir CSS desde cero. |
| **Supabase** | La bodega + el sistema de pedidos del restaurante | Es la base de datos en la nube: guarda toda la información (usuarios, condominios, pagos, etc.) y expone esa información de forma segura a la app. |
| **Supabase Auth** | El guardia de seguridad en la entrada | Sistema de inicio de sesión y registro (login/signup), maneja contraseñas, sesiones y permisos de quién puede ver qué. |

### Herramientas adicionales recomendadas

| Herramienta | Para qué sirve |
|---|---|
| **shadcn/ui** | Componentes visuales ya construidos (botones, formularios, modales) para no diseñar todo desde cero. |
| **Zod + React Hook Form** | Validan que los datos que llena un usuario en un formulario sean correctos antes de guardarlos. |
| **ESLint + Prettier + Husky** | Revisan automáticamente que el código tenga un estilo consistente antes de subirlo, evitando errores tontos. |
| **Vercel** | Plataforma donde se publica (despliega) la aplicación para que el mundo la vea. |
| **Sentry** *(opcional, fase 2)* | Avisa automáticamente cuando algo falla en producción, con detalles del error. |

**En resumen:** el usuario ve una página hecha con Next.js + Tailwind, escrita en TypeScript. Cuando necesita guardar o leer datos (crear cuenta, ver info de su condominio, etc.), la app le habla a Supabase, que se encarga de la base de datos y del login.

---

## 3. Metodología de Trabajo

Usamos **GitHub** como el centro de control del proyecto: ahí viven el código, las tareas (tickets) y el historial de cambios.

### 3.0 Decisiones técnicas y estructurales

Todas las decisiones técnicas y estructurales del proyecto (elección o cambio de herramientas del stack, arquitectura de la base de datos, estructura de carpetas, convenciones de código, etc.) las toma **David**. Esto no significa que las ideas u observaciones del resto del equipo no se tomen en cuenta, sino que la decisión final sobre "cómo se construye" el proyecto pasa por él, para mantener consistencia y evitar que el código se vuelva inconsistente al tener varias personas decidiendo por su cuenta.

Si alguien detecta un problema con el stack o cree que hace falta una herramienta nueva, lo correcto es levantarlo como punto de conversación (o como ticket tipo `Docs`/`Chore`), no implementarlo directamente sin aprobación.

### 3.1 Tickets (Issues)

Cada tarea, error o mejora se registra como un **Issue** en GitHub antes de empezar a trabajar en ella. Esto evita que dos personas trabajen en lo mismo sin saberlo y deja registro de qué se hizo y por qué.

**Plantilla básica de un ticket:**
```
Título: [Tipo] Descripción corta
Ejemplo: [Feature] Crear formulario de registro de usuario

Descripción: ¿Qué hay que hacer? ¿Por qué?
Criterios de aceptación: ¿Cómo sabemos que está terminado?
Responsable: (quién lo va a hacer)
```

Tipos comunes: `Feature` (función nueva), `Bug` (error), `Chore` (tarea de mantenimiento), `Docs` (documentación).

### 3.2 Ramas (Branches): la analogía del borrador

Imagina que el código en `main` es el **libro final publicado**. Nadie escribe directo ahí. Cada persona trabaja en su propio **borrador** (rama) y solo cuando ese borrador está revisado y aprobado, se une al libro.

Estructura de ramas:

```
main         →  Versión estable, la que está "en vivo" (producción)
   ↑
develop      →  Rama de integración: aquí se juntan los avances de todos antes de pasar a main
   ↑
feature/xxx  →  Una rama por persona/tarea, sale de develop
fix/xxx      →  Rama para corregir un error puntual
```

**Convención de nombres de rama:**
- `feature/nombre-de-la-tarea` → ej. `feature/login-supabase`
- `fix/nombre-del-error` → ej. `fix/boton-registro-no-funciona`

### 3.3 Flujo de trabajo paso a paso

1. Se crea un **ticket (Issue)** describiendo la tarea.
2. La persona asignada crea una rama desde `develop`:
   `feature/nombre-de-la-tarea`
3. Trabaja y guarda avances con **commits** claros (ver 3.4).
4. Cuando termina, sube la rama a GitHub y abre un **Pull Request (PR)** hacia `develop`.
5. Al menos otra persona del equipo **revisa el PR** (revisar código, probar que funcione).
6. Si todo está bien, se aprueba y se hace **merge** a `develop`.
7. Cuando `develop` tiene un conjunto de cambios probado y estable, se abre un PR de `develop` → `main`, y ahí sí se publica (deploy) a producción.

```
tú:      feature/login-supabase ──┐
compañero: feature/tabla-pagos ───┼──► develop ──► (probado y estable) ──► main ──► deploy
```

### 3.4 Convención de commits

Usamos mensajes de commit cortos y con un prefijo que indica el tipo de cambio:

```
feat: agrega formulario de login
fix: corrige error al guardar usuario
style: ajusta espaciados con tailwind
docs: actualiza guía de instalación
chore: actualiza dependencias
```

Esto permite entender rápido el historial del proyecto sin tener que leer todo el código.

### 3.5 Manejo de errores

- Todo error detectado (en desarrollo o por un usuario) se registra como un **ticket tipo `Bug`**, nunca se corrige "silenciosamente" sin dejar rastro.
- En el código, los errores se capturan con bloques `try/catch` y se muestran mensajes claros al usuario (nunca el error técnico crudo).
- En Supabase, cualquier error de base de datos o de autenticación debe registrarse en consola durante desarrollo, y (en fase 2) enviarse a una herramienta como **Sentry** para monitoreo en producción.

---

## 4. Checklist antes de fusionar (merge) una rama

- [ ] El código compila sin errores de TypeScript
- [ ] Se probó manualmente la función en el navegador
- [ ] No quedaron `console.log` de prueba olvidados
- [ ] El PR tiene una descripción clara de qué cambia
- [ ] Al menos una persona revisó el PR antes de aprobarlo

---

## 5. Resumen visual del flujo completo

```
[Ticket creado] → [Rama feature/xxx] → [Commits] → [Pull Request] → [Revisión] → [Merge a develop] → [Pruebas] → [Merge a main] → [Deploy en Vercel]
```
