import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			'neon-pink': '#ff0080',
  			'neon-cyan': '#00ffff',
  			'neon-green': '#39ff14',
  			'neon-purple': '#bf00ff',
  			'neon-orange': '#ff6600',
  			'neon-yellow': '#ffff00',
  			'music-dark': '#0a0a0a',
  			'music-darker': '#050505',
  			'vinyl-black': '#1a1a1a',
  			'speaker-gray': '#2a2a2a',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  						'pulse-neon': {
				'0%, 100%': { 
					textShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
				},
				'50%': { 
					textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
				},
			},
			'rainbow-pulse': {
				'0%': { filter: 'hue-rotate(0deg)' },
				'100%': { filter: 'hue-rotate(360deg)' }
			},
  			'rotate-vinyl': {
  				'0%': { transform: 'rotate(0deg)' },
  				'100%': { transform: 'rotate(360deg)' },
  			},
  			'bounce-note': {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-10px)' },
  			},
  			'spectrum-dance': {
  				'0%': { height: '20%' },
  				'25%': { height: '60%' },
  				'50%': { height: '100%' },
  				'75%': { height: '40%' },
  				'100%': { height: '20%' },
  			}
  		},
  				animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'pulse-neon': 'pulse-neon 3s ease-in-out infinite',
			'rainbow-pulse': 'rainbow-pulse 4s linear infinite',
			'rotate-vinyl': 'rotate-vinyl 3s linear infinite',
			'bounce-note': 'bounce-note 2s ease-in-out infinite',
			'spectrum-dance': 'spectrum-dance 1s ease-in-out infinite',
		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
