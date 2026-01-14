// Implementación REAL de calcularPuntaje()

const { FACTORES_POSICION } = require("../config/positions");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function calcularPuntaje(player, partidosTotalesSistema, posicion) {
  const factorPosicion = FACTORES_POSICION[posicion] || 0;

  const compromiso = player.estadoCompromiso || 0;
  const jugados = player.partidosJugados || 0;

  let factorRotacion = 1;
  if (partidosTotalesSistema > 0) {
    factorRotacion = 1 - jugados / partidosTotalesSistema;
    factorRotacion = clamp(factorRotacion, 0, 1);
  }

  const puntaje =
    factorPosicion * 3 +
    compromiso * 2 +
    factorRotacion * 2;

  return Number(puntaje.toFixed(2));
}

module.exports = {
  calcularPuntaje
};
