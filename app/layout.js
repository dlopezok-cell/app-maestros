import './globals.css';

export const metadata = {
    title: 'Maestros - encuentra al mejor cerca de ti',
    description: 'Agenda, videollamada de diagnostico y reputacion verificada para los oficios de Chile',
};

export default function RootLayout({ children }) {
    return (
          <html lang="es">
            <body>{children}</body>
      </html>
    );
}
