
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




function lerp(t, a, b){
    return (1-t)*a + t*b;
}










//////////////////////////
//////////////////////////



var Transition = function()
{
	this.cpt = 0;
	this.speed = 0.1;
	this.tween = 1;
	this.isFinished = true;

	this.origine;
	this.destination;


	this.setup = function(origine, destination){
		
		this.isFinished = false;
		this.cpt = 0;
		this.origine = origine;
		this.destination = destination;
	}


	this.execute = function()
	{
		
		if(!this.isFinished)
		{
			if(this.cpt > 1){
				this.isFinished = true;
				return this.destination;
			} else {
				var ajoutCpt;
				if(this.tween == -1){
					ajoutCpt = this.speed/(this.cpt+10);	
				} else if(this.tween == 1){
					ajoutCpt = this.speed*(this.cpt+0.01);
				} else {
					ajoutCpt = this.speed;
				}	
				this.cpt += ajoutCpt;
			}

			var currentPosition = this.origine;
			currentPosition = lerp(this.cpt, this.origine, this.destination);

			return currentPosition;
		} else {
			return this.destination;
		}
	}


	this.execute3d = function()
	{
		
		if(!this.isFinished)
		{
			if(this.cpt > 1){
				this.isFinished = true;
				return this.destination;
			} else {
				var ajoutCpt;
				if(this.tween == -1){
					ajoutCpt = this.speed/(this.cpt+10);	
				} else if(this.tween == 1){
					ajoutCpt = this.speed*(this.cpt+0.01);
				} else {
					ajoutCpt = this.speed;
				}	
				this.cpt += ajoutCpt;
			}

			var currentPosition = this.origine;
			currentPosition[0] = lerp(this.cpt, this.origine[0], this.destination[0]);
			currentPosition[1] = lerp(this.cpt, this.origine[1], this.destination[1]);
			currentPosition[2] = lerp(this.cpt, this.origine[2], this.destination[2]);

			return currentPosition;
		} else {
			return this.destination;
		}
	}



	this.setSpeed = function(newSpeed){ this.speed = newSpeed; }
	this.setTween = function(newTween){ this.tween = newTween; }

}




