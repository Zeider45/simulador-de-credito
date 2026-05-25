"use client";

import { Button } from "@/components/ui/button";

export default function HelpFab() {
  const openTips = () => {
    const tips = `Consejos rápidos:\n- Usa "Crear credito" para empezar.\n- En la simulación activa "Reconducir tras prepago" para ajustar plazo o cuota.\n- Consulta el detalle de cada cuota para ver mora y valorización.`;
    alert(tips);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button className="rounded-full shadow-soft" onClick={openTips}>
        Ayuda
      </Button>
    </div>
  );
}
