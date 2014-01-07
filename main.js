
window.addEventListener("load", setup, false);





var canvas;
var dessin;
var projection = d3.geo
	//.azimuthalEqualArea();
	.mercator();
	//.conicEquidistant();
	//.orthographic();
var path = d3.geo.path().projection(projection);
	
var largeurFenetre = window.innerWidth;

var width = largeurFenetre;
var height = window.innerHeight;
var imageTexture;






function setup()
{	

	queue()
		.defer(lireJson, "world-countries-clean.json")
		.defer(lireCsv, "index2013.csv")
		.awaitAll(ready);
	
}



function ready(error, results) 
{



	// dessin de la carte avec d3
	var svg = d3.select("#conteneur").append("svg")
		.attr("width", width)
	    .attr("height", height)
	    .attr("id","svg");


	    
	var carted3js = svg.attr("id", "carted3js");
	carted3js.selectAll("path").data(results[0].features).enter()
		.append("svg:path")
		.attr("id", function(d){ return d.id; })
		.attr("d", path)
		.style("stroke", "#000")
		.style("fill", "rgba(100,240,136,1)");


	var svgImg = document.getElementById("carted3js");

    // transforme le svg en image
    var xml = new XMLSerializer().serializeToString(svgImg);
	var data2 = "data:image/svg+xml;base64," + btoa(xml);
	
	imageTexture = new Image();
	imageTexture.setAttribute('src', data2),
	document.body.appendChild(imageTexture);

	// creation du canvas 2d
	var canvas2d = document.createElement( "canvas" );
	canvas2d.width = width;
	canvas2d.height = height;

	var context = canvas2d.getContext( '2d' );
	

	context.drawImage(imageTexture, 0, 0);
	imageTextureData = context.getImageData( 0, 0, width, height );
	context.putImageData( imageTextureData, 0, 0 );
	//document.body.appendChild(canvas2d);

	var textureCarted3js = new THREE.Texture( canvas2d );
	textureCarted3js.needsUpdate = true;





	// dessin 3d
	canvas = new Canvas();
	canvas.setup(window.innerWidth, window.innerHeight);
	
	dessin = new Dessin();
	dessin.setup(canvas.scene, textureCarted3js);
	dessin.draw(canvas.scene, results[0], results[1]);

	animate();

}





function animate()
{

	requestAnimationFrame( animate );	
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




	this.setup = function(scene, textureCarted3js)
	{
		this.centroid = [];

		var HG = projection([-180,84]);
		var HD = projection([180,84]);
		var BD = projection([180,-66]);
		var BG = projection([-180,-66]);
		var MG = projection([-180,0]);
		var MD = projection([180,0]);

		// TEXTURE
		var texture = THREE.ImageUtils.loadTexture("imageCarte.png");
		// texture.wrapS = THREE.RepeatWrapping; 
		// texture.wrapT = THREE.RepeatWrapping;

		//MATERIAL
		this.materialMesh = new THREE.MeshLambertMaterial({ 
	    	map: textureCarted3js,
	    	//color:0xffee99,
	    	side: THREE.DoubleSide
	    });

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
	        color: 0xffffff,
			transparent: true, opacity: 0
	    });
	    this.material3 = new THREE.LineBasicMaterial({
	        color: 0x6666ff,
			transparent: true, opacity: 1
	    });	
		
      	
	}




	this.draw = function(scene, data, dataIndex)
	{		

		
		this.dessinerCartePlate(scene, data, dataIndex);
		this.dessinerNotesPays(scene);


	}
	


	this.dessinerCartePlate = function(scene, data, dataIndex)
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
				var centro = [centroidTemporaire[0], centroidTemporaire[1], -(k)*0.2 ]			
				this.centroid.push( centro );

				/*
				// traits du centroid vers la note
				var g = new THREE.Geometry();
				g.vertices.push(new THREE.Vector3(centro[0], centro[1], 0));
				g.vertices.push(new THREE.Vector3(centro[0], centro[1], centro[2]));
				var l = new THREE.Line(g, this.material3);
				scene.add(l);
				*/

			}

			//this.dessinerFormePays(scene, data, color, k);

		}
	}




	this.dessinerFormePays = function(scene, data, color, k)
	{

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



	
	this.dessinerNotesPays = function(scene)
	{

		var delaunay = d3.geom.delaunay(this.centroid);

	    var geometrie = new THREE.Geometry();

	    for (var i=0; i < delaunay.length; i++ )
	    {
	    	geometrie.vertices.push(new THREE.Vector3(delaunay[i][0][0], delaunay[i][0][1], delaunay[i][0][2]));
			geometrie.vertices.push(new THREE.Vector3(delaunay[i][1][0], delaunay[i][1][1], delaunay[i][1][2]));
			geometrie.vertices.push(new THREE.Vector3(delaunay[i][2][0], delaunay[i][2][1], delaunay[i][2][2]));
			geometrie.faces.push( new THREE.Face3( 3*i, 1+3*i, 2+3*i ));

		    geometrie.faceVertexUvs[0].push([
		        new THREE.Vector2( map(delaunay[i][0][0],1,width,0,1), map(delaunay[i][0][1],1,height,1,0) ),
		        new THREE.Vector2( map(delaunay[i][1][0],1,width,0,1), map(delaunay[i][1][1],1,height,1,0) ),
		        new THREE.Vector2( map(delaunay[i][2][0],1,width,0,1), map(delaunay[i][2][1],1,height,1,0) )
	        ]);

	    }

	    geometrie.computeFaceNormals();

	    var mesh = new THREE.Mesh(geometrie, this.materialMesh);
	    mesh.doubleSided = true;		
	    scene.add(mesh);

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
	this.centreCarte;
	this.positionInitCam;
	this.xSouris;
	this.scrollSouris;

	this.setup = function(WIDTH, HEIGHT)
	{

		var VIEW_ANGLE = 45,
		    ASPECT = WIDTH / HEIGHT,
		    NEAR = 0.1,
		    FAR = 10000;


		this.scrollSouris = 100
		this.centreCarte = projection([0,0]);
		this.positionInitCam = projection([0,-89]);

		this.scene = new THREE.Scene();

		//this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
		this.camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 10000 );
		this.camera.position.set(this.positionInitCam[0], this.positionInitCam[1], -1000);
		this.camera.lookAt(new THREE.Vector3(this.centreCarte[0], this.centreCarte[1], -100));
		this.camera.up = new THREE.Vector3(0, 0, -1);
		this.scene.add(this.camera);
	
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(WIDTH, HEIGHT);
		this.renderer.setClearColor("#ffffff", 1);

		// LIGHT
		this.scene.add( new THREE.AmbientLight( 0x212223 ) );
		var light = new THREE.DirectionalLight( 0xffffff, 1 );
		light.position.set( -200, 0, -200 );
		this.scene.add(light);

		document.body.appendChild(this.renderer.domElement);
		
		var clone = this;
		document.addEventListener("mousemove", function(event){ clone.onMouseMove(event); }, false);
		document.addEventListener("mousewheel", function(event){ clone.onMouseScroll(event); }, false);
		//document.addEventListener("DOMMouseScroll", function(event){ clone.onMouseScroll(event); }, false);

	}
	
	
	this.draw = function()
	{
		this.renderer.render(this.scene, this.camera);	
	}
	
	
	this.onMouseMove = function(event)
	{
		this.xSouris = event.clientX;

		this.positionCamera();
		//this.camera.position.x = map(this.xSouris, 0, window.innerWidth, -1000, 1000);
		//this.camera.position.z = map(event.clientY, 0, window.innerHeight, -1000, 1000);
		//this.camera.position.z = map(xSouris, 0, window.innerWidth, -1000, 1000);
		//this.camera.lookAt(new THREE.Vector3(this.centreCarte[0], this.centreCarte[1], -100));
		return false;
	}

	this.onMouseScroll = function(e) {

	    // cross-browser wheel delta
	    var e = window.event || e;
	    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
	    this.scrollSouris += delta;
	    this.scrollSouris = Math.min(this.scrollSouris, 70);
	    this.scrollSouris = Math.max(this.scrollSouris, 40);
		
		this.positionCamera();
	    return false;
	
	}

	this.positionCamera = function()
	{

		var coordonneesCamera = []
		var angleMax = 180;
		var angleOrbiteCamera, rayonOrbiteCamera;
		var rayonMin = 100;
		var rayonMax = projection([180,0]);
			rayonMax = rayonMax[1];

		angleOrbiteCamera =  angleMax * this.xSouris / largeurFenetre;

		// calcul du rayon de l'orbite de la caméra
		rayonOrbiteCamera = this.positionInitCam[1]*this.scrollSouris/100
		coordonneesCamera = [Math.cos(angleOrbiteCamera*(Math.PI/180))*rayonOrbiteCamera, Math.sin(angleOrbiteCamera*(Math.PI/180))*rayonOrbiteCamera] ;
		
		this.camera.position.x = coordonneesCamera[0]+this.positionInitCam[0];
		this.camera.position.y = coordonneesCamera[1];
		this.camera.lookAt(new THREE.Vector3(this.centreCarte[0], this.centreCarte[1], -100));

	}


	

	
}














