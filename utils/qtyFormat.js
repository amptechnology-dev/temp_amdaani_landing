// Qty max 3 decimal. Float error (8.216000000000001) ar trailing zero soriye dey.
// 5.666 -> "5.666", 2.5 -> "2.5", 3 -> "3", 8.216000000000001 -> "8.216"
export const formatQty = (n) => {
  const v = Math.round((Number(n) || 0) * 1000) / 1000;
  return String(parseFloat(v.toFixed(3)));
};

// Qty jog korar jonno (float error chara)
export const sumQty = (list, pick) =>
  Math.round(list.reduce((s, i) => s + (Number(pick(i)) || 0), 0) * 1000) / 1000;