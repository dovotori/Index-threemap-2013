
window.addEventListener("load", setup, false);





var canvas;
var dessin;
var projection = d3.geo
	//.azimuthalEqualArea();
	.mercator();
	//.conicEquidistant();
	//.orthographic();
	
var largeurFenetre = window.innerWidth;
var path = d3.geo.path().projection(projection);
var scrollSouris = 0;





function setup()
{	

	queue()
		.defer(lireJson, "world-countries-clean.json")
		.defer(lireCsv, "index2013.csv")
		.awaitAll(ready);
	
}







function ready(error, results) 
{

	canvas = new Canvas();
	canvas.setup(window.innerWidth, window.innerHeight);
	
	dessin = new Dessin();
	dessin.setup(canvas.getScene());
	dessin.draw(canvas.getScene(), results[0], results[1]);
	
	animate();

}





function animate()
{

	requestAnimationFrame( animate );	
	//dessin.draw(canvas.getScene());
	canvas.draw();

}








//////////////////////////////////////////////
///////////////// D3 ////////////////////////
////////////////////////////////////////////

function lireCsv(url, callback) {
	d3.csv(url, function(d){ callback(null, d); });
}
function lireJson(url, callback) {
	d3.json(url, function(d){ callback(null, d); });
}



function getPath(path){

	var chaine = path.replace(/Z/g,""); 
	chaine = chaine.replace(/[L,]/g," ");
	var pathFragment = chaine.split("M");
	var coor = [];


	for(var i = 1; i < pathFragment.length; i++) // on commence a un car le split fait une premiere partie vide
	{
		var coordonnees = pathFragment[i].split(" ");
		coor[i-1] = [];

		for(var j = 0; j < coordonnees.length; j++) 
		{
			coor[i-1][j] = parseFloat(coordonnees[j]);
		}	
	}
	return coor;
}









/////////////////////////////////////////////
//////////// DESSIN ////////////////////////
////////////////////////////////////////////

var Dessin = function()
{

	this.material;
	this.material2;
	this.material3;
	this.materialMesh;
	this.centroid;
	// this.group; = new THREE.Object3D();//create an empty container
	// group.add( mesh );//add a mesh with geometry to it
	// scene.add( group );//when done, add the group to the scene



	this.setup = function(scene)
	{
		this.centroid = [];

		var HG = projection([-180,84]);
		var HD = projection([180,84]);
		var BD = projection([180,-66]);
		var BG = projection([-180,-66]);
		var MG = projection([-180,0]);
		var MD = projection([180,0]);

		this.centroid.push( [ HG[0] , HG[1] , 0 ]);
		this.centroid.push( [ HD[0] , HD[1] , 0 ]);
		this.centroid.push( [ BD[0] , BD[1] , 0 ]);
		this.centroid.push( [ BG[0] , BG[1] , 0 ]);
		this.centroid.push( [ MG[0] , MG[1] , 0 ]);
		this.centroid.push( [ MD[0] , MD[1] , 0 ]);

		this.material = new THREE.LineBasicMaterial({
	        color: 0x666666,
			linewidth: 1
	    });
	    this.material2 = new THREE.LineBasicMaterial({
	        color: 0x0000ff,
			transparent: true, opacity: 0.2
	    });
	    this.material3 = new THREE.LineBasicMaterial({
	        color: 0x6666ff,
			transparent: true, opacity: 0.2
	    });	

	    this.materialMesh = new THREE.MeshLambertMaterial({
	    	color: 0xffffff,
	    	transparent: true, opacity: 1
	    });
		this.materialMesh.side = THREE.DoubleSide;
		
		// light
		scene.add( new THREE.AmbientLight( 0x212223 ) );
		var light = new THREE.DirectionalLight(0xffffff, 1);
		light.position.set( -200, 0, -200 );
		scene.add(light);

      	
	}




	this.draw = function(scene, data, dataIndex)
	{		

		// dessin de la carte
		for(var k = 0; k < data.features.length; k++)
		{

			// couleur du pays
			var isIndexed = false;
			var color = "#333";
			for(var l = 0; l < dataIndex.length; l++)
			{


				if(dataIndex[l].iso == data.features[k].id)
				{
					
					isIndexed = true;

					switch(dataIndex[l].cat)
					{
						case "Very serious situation": 	color = "#000000"; break;
						case "Difficult situation": 	color = "#dc002e"; break;
						case "Noticeable problems": 	color = "#f29901"; break;
						case "Satisfactory situation": 	color = "#fee504"; break;
						case "Good situation": 			color = "#fff"; break;
						default: 						color = "#000"; break;
					}
				}	
			}



			if(isIndexed)
			{


				// calcul du centroid
				var centroidTemporaire = path.centroid(data.features[k]);

				var centro = [centroidTemporaire[0], centroidTemporaire[1], (k-180)*0.3 ];

				
				this.centroid.push( centro );
				//this.centroid[k] = [centroidTemporaire[0], centroidTemporaire[1], k-200 ];

				// traits du centroid vers la note
				var g = new THREE.Geometry();
				g.vertices.push(new THREE.Vector3(centro[0], centro[1], 0));
				g.vertices.push(new THREE.Vector3(centro[0], centro[1], centro[2]));
				var l = new THREE.Line(g, this.material3);
				scene.add(l);
			}


			var material = new THREE.MeshBasicMaterial( { color: color, transparent: true, opacity: 0.8 } );
			material.side = THREE.DoubleSide;

			// recuperer les coordonnees
			var coor = getPath(path(data.features[k]));

			for(var i = 0; i < coor.length; i++)
			{
				var c = [];
				var geometryBorder = new THREE.Geometry();

				for(var j = 0; j < coor[i].length; j+=2)
				{
					c.push( new THREE.Vector2 ( coor[i][j], coor[i][j+1] ) );
					geometryBorder.vertices.push(new THREE.Vector3(coor[i][j], coor[i][j+1], 0));
				}
				
				// dernier points pour fermer la forme
				c.push( new THREE.Vector2(coor[i][0], coor[i][1] ) );
				geometryBorder.vertices.push(new THREE.Vector3(coor[i][0], coor[i][1], 0));

				// creation de la forme et de sa geometrie
				var shape = new THREE.Shape(c);
				var geometry = new THREE.ShapeGeometry( shape );

				// dessin de la forme pleine
				var mesh = new THREE.Mesh( geometry, material );
				scene.add(mesh);

				// dessin de la ligne
				var line = new THREE.Line(geometryBorder, this.material);
				line.position.set(0, 0, -1);
				
				scene.add(line);

			}

		}

		this.dessinerNotesPays(scene);


	}
	

	
	this.dessinerNotesPays = function(scene)
	{

		// delaunay sur les centroid
		var schema = d3.geom.delaunay(this.centroid);

		// dessin des centroids
		for(var i = 0; i < schema.length; i++)
		{
			var geometry = new THREE.Geometry();
			var g = new THREE.Geometry();

			for(var j = 0; j < 3; j++)
			{	
				geometry.vertices.push(new THREE.Vector3(schema[i][j][0], schema[i][j][1], schema[i][j][2]));
				g.vertices.push(new THREE.Vector3(schema[i][j][0], schema[i][j][1], schema[i][j][2]));
			}

			// dessin de la ligne
			var line = new THREE.Line(geometry, this.material2);
			scene.add(line);

			// dessin de la forme pleine
			g.faces.push( new THREE.Face3( 0, 1, 2 ) );
			g.computeFaceNormals();
			var mesh = new THREE.Mesh(g, this.materialMesh);
			mesh.doubleSided = true;
			scene.add(mesh);			
			

		}

	}

}












/////////////////////////////////////////////
//////////// CANVAS ////////////////////////
////////////////////////////////////////////

var Canvas = function()
{
	this.camera;
	this.renderer;
	this.scene;
	this.rayon;
	
	this.setup = function(WIDTH, HEIGHT)
	{

		var VIEW_ANGLE = 45,
		    ASPECT = WIDTH / HEIGHT,
		    NEAR = 0.1,
		    FAR = 10000;

		this.rayon = 1000;
	
		this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
		this.camera.position.set(400, 200, -1000);
		this.camera.up = new THREE.Vector3(0, -1, 0);

		var targetCam = projection([0,0]);
		this.camera.lookAt(new THREE.Vector3(targetCam[0], targetCam[1], 0));
		
		this.scene = new THREE.Scene();
	
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(WIDTH, HEIGHT);
		this.renderer.setClearColor("#888888", 1);

		this.renderer.shadowMapEnabled = true;
		this.renderer.shadowMapSoft = true;

		this.renderer.shadowCameraNear = 3;
		this.renderer.shadowCameraFar = this.camera.far;
		this.renderer.shadowCameraFov = 50;

		this.renderer.shadowMapBias = 0.0039;
		this.renderer.shadowMapDarkness = 0.5;
		this.renderer.shadowMapWidth = 1024;
		this.renderer.shadowMapHeight = 1024;
	
		document.body.appendChild(this.renderer.domElement);
		
		var clone = this;
		document.addEventListener("mousemove", function(event){ clone.interactionSouris(event); }, false);
		//document.addEventListener("scroll", function(event){ clone.interactionScroll(event); }, false);
		//document.addEventListener("keydown", function(event){ clone.interactionClavier(event); }, false);
		


	}
	
	
	this.draw = function()
	{
		this.scene.add(this.camera);
		this.renderer.render(this.scene, this.camera);	
	}
	
	
	this.interactionScroll = function(event)
	{
		console.log(event);
	}
	
	this.interactionSouris = function(event)
	{

		var mouseX = event.clientX;	
		var mouseY = event.clientY;
		
		var angle = map(mouseX, 0, window.innerWidth, 0, 360);

		var targetCam = projection([0,0]);

		// mouvement de bas en haut
		var coor = positionCamera(mouseX);
		console.log(coor[0]+" "+coor[1]);
		this.camera.position.x = coor[0];
		this.camera.position.y = coor[1];
		//this.camera.position.z = map(mouseY, 0, window.innerHeight, 0, -2000);
		
		// camera regarde le centre de la carte
		this.camera.lookAt(new THREE.Vector3(targetCam[0], targetCam[1], 0));
		
	}



	this.interactionClavier = function(event)
	{
		
		/*if(event.keyCode == 40)
		{
			this.camera.position.y += 10;
		} else if (event.keyCode == 38){
			this.camera.position.y -= 10;
		}*/
		
	}

	
	
	
	// GET / SET ///////////////////////////
	this.getScene = function(){ return this.scene; }
	
}




function positionCamera(xSouris)
{
	var coordonneesCamera = [], limiteAngle;
	var angleOrbiteCamera, rayonOrbiteCamera;
	var rayonMin = 100;
	var rayonMax = projection([0,180]);
	rayonMax = rayonMax[1];

	angleOrbiteCamera = largeurFenetre * xSouris / limiteAngle;
	rayonOrbiteCamera = map(scrollSouris, 0, 100, rayonMin, rayonMax); 
	coordonneesCamera[0] = Math.cos(angleOrbiteCamera)*rayonOrbiteCamera;
	coordonneesCamera[1] = Math.sin(angleOrbiteCamera)*rayonOrbiteCamera;

	return coordonneesCamera;
}



window.addEventListener("mousewheel", mouseWheelHandler);
window.addEventListener("DOMMouseScroll", mouseWheelHandler);
function mouseWheelHandler(e) {
    // cross-browser wheel delta
    var e = window.event || e;
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
    scrollSouris += delta;
    scrollSouris = Math.min(scrollSouris, 100);
    scrollSouris = Math.max(scrollSouris, 0);

    console.log(scrollSouris);
    return false;
}






