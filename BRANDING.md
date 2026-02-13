# 🎨 Guía de Personalización IPHONESHOP

## Agregar Logo

### Paso 1: Preparar logo
1. Logo en PNG o SVG (512x512px)
2. Guardar en: `public/assets/logos/logo-iphoneshop.png`

### Paso 2: En LoginScreen (App.tsx)

Buscar el componente LoginScreen y cambiar:
```tsx
// ANTES:
<div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${darkMode ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-100 text-emerald-600'}`}>
    <Package size={32} />
</div>

// DESPUÉS:
<div className="mb-4">
    <img 
        src="/assets/logos/logo-iphoneshop.png" 
        alt="IPHONESHOP Logo" 
        className="w-24 h-24 mx-auto object-contain"
    />
</div>
```

### Paso 3: En Sidebar (App.tsx)

Buscar el aside del sidebar y cambiar:
```tsx
// ANTES:
<h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
    <Package className="text-emerald-500" />
    SIGIR5
</h1>

// DESPUÉS:
<div className="flex items-center gap-3">
    <img 
        src="/assets/logos/logo-iphoneshop.png" 
        alt="Logo" 
        className="w-10 h-10 object-contain"
    />
    <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
            IPHONESHOP
        </h1>
        <p className="text-xs text-emerald-400">Tech Inventory</p>
    </div>
</div>
```

### Paso 4: Actualizar favicon

1. Crea un favicon (32x32px) llamado `favicon.ico`
2. Guárdalo en: `public/`
3. En `index.html`, modifica:
```html
<!-- ANTES -->
<link rel="icon" type="image/svg+xml" href="/vite.svg" />

<!-- DESPUÉS -->
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/assets/logos/logo-iphoneshop.png" />
```

## Cambiar Colores del Theme

### Colores Actuales (Verde Esmeralda)
- Primario: `emerald-600` (#10b981)
- Hover: `emerald-700`

### Para cambiar a otro color (ej: Azul)

Busca y reemplaza en `App.tsx`:
```
bg-emerald-600   →   bg-blue-600
text-emerald-500 →   text-blue-500
border-emerald   →   border-blue
ring-emerald     →   ring-blue
```

### Colores Sugeridos para Tech Store:

- **Azul Tech:** `blue-600` (#2563eb)
- **Morado:** `purple-600` (#9333ea)
- **Cyan:** `cyan-600` (#0891b2)
- **Índigo:** `indigo-600` (#4f46e5)

## Estructura de Assets Recomendada
```
public/
├── assets/
│   ├── logos/
│   │   ├── logo-iphoneshop.png      (Logo principal)
│   │   ├── logo-icon.png            (Solo icono)
│   │   └── logo-white.png           (Versión blanca)
│   └── images/
│       ├── promo-banner.png
│       ├── placeholder-phone.png
│       └── no-image.png
└── favicon.ico
```

## Personalizar Metadata

En `index.html`:
```html
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- SEO -->
    <title>IPHONESHOP - Sistema de Inventario Tech</title>
    <meta name="description" content="Sistema profesional de gestión de inventario para tiendas de tecnología" />
    
    <!-- Open Graph -->
    <meta property="og:title" content="IPHONESHOP" />
    <meta property="og:description" content="Gestión de inventario tecnológico" />
    <meta property="og:image" content="/assets/logos/logo-iphoneshop.png" />
</head>
```

---

**¿Necesitas ayuda con el diseño?** Consulta el README.md
