
function getRandom(min, max) 
{
    return Math.random() * (max - min) + min;
}


function map(valeur, minRef, maxRef, minDest, maxDest) {
  return minDest + (valeur - minRef) * (maxDest - minDest) / (maxRef - minRef);
}


function signe(valeur)
{
  if(valeur == 0)
    return 0;
  else if(valeur > 0)
    return 1;
  else
    return -1;
}


