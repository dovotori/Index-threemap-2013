
window.addEventListener("load", setup, false);



var largeurFenetre = window.innerWidth;
var width = largeurFenetre;
var height = window.innerHeight;



var canvas;
var dessin;
var projection = d3.geo
	//.azimuthalEqualArea();
	//.conicEquidistant();
	//.orthographic();
	.mercator();
projection.scale(80);
var path = d3.geo.path().projection(projection);
	
var imageTexture;
var centroid;







function lireCsv(url, callback) {
	d3.csv(url, function(d){ callback(null, d); });
}
function lireJson(url, callback) {
	d3.json(url, function(d){ callback(null, d); });
}


function setup()
{	
	queue()
		.defer(lireJson, "world-countries-clean.json")
		.defer(lireCsv, "index2013.csv")
		.awaitAll(ready);
	
}




function ready(error, results) 
{

	centroid = [];

	var HG = projection([-180,84]);
	var HD = projection([180,84]);
	var BD = projection([180,-66]);
	var BG = projection([-180,-66]);
	var MG = projection([-180,0]);
	var MD = projection([180,0]);

	centroid.push( [ HG[0] , HG[1] , 0 ]);
	centroid.push( [ HD[0] , HD[1] , 0 ]);
	centroid.push( [ BD[0] , BD[1] , 0 ]);
	centroid.push( [ BG[0] , BG[1] , 0 ]);
	centroid.push( [ MG[0] , MG[1] , 0 ]);
	centroid.push( [ MD[0] , MD[1] , 0 ]);


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
		.style("fill", "rgba(100,240,136,1)")
		.each(function(d){  

			// verifie si le pays est indexé
			for(var i = 0; i < results[1].length; i++)
			{

				// affecte la hauteur;
				var hauteur = 0;
				if(results[1][i].iso == d.id)
				{
					switch(results[1][i].cat)
					{
						case "Very serious situation":
							hauteur = 1;
						break;
						case "Difficult situation":
							hauteur = 0.8;
						break; 

						case "Noticeable problems":
							hauteur = 0.6;
						break;
						case "Satisfactory situation":
							hauteur = 0.4;
						break;
						case "Good situation":
							hauteur = 0;
						break;
						default:
							hauteur = 0;
						break;
				
					}

					// ajout dans les centroids
					var centroidTemporaire = path.centroid(d);
					centroid.push( [ centroidTemporaire[0], centroidTemporaire[1], -hauteur*20 ]);	

				}	
			}

		});










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

	// creation de la texture THREE
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













/////////////////////////////////////////////
//////////// DESSIN ////////////////////////
////////////////////////////////////////////

var Dessin = function()
{
	this.materialMesh;




	this.setup = function(scene, textureCarted3js)
	{
		

		//MATERIAL
		this.materialMesh = new THREE.MeshLambertMaterial({ 
	    	map: textureCarted3js,
	    	//color:0xffee99,
	    	side: THREE.DoubleSide
	    });


		
		

	}




	this.draw = function(scene)
	{		

		
		var delaunay = d3.geom.delaunay(centroid);

	    var geometrie = new THREE.Geometry();

	    for (var i=0; i < delaunay.length; i++ )
	    {
	    	geometrie.vertices.push(new THREE.Vector3(delaunay[i][0][0], delaunay[i][0][1], delaunay[i][0][2]));
			geometrie.vertices.push(new THREE.Vector3(delaunay[i][1][0], delaunay[i][1][1], delaunay[i][1][2]));
			geometrie.vertices.push(new THREE.Vector3(delaunay[i][2][0], delaunay[i][2][1], delaunay[i][2][2]));
			geometrie.faces.push( new THREE.Face3( 3*i, 1+3*i, 2+3*i ));

		    geometrie.faceVertexUvs[0].push([
		        new THREE.Vector2( map(delaunay[i][0][0], 0,width, 0,1), map(delaunay[i][0][1], 0,height, 1,0) ),
		        new THREE.Vector2( map(delaunay[i][1][0], 0,width, 0,1), map(delaunay[i][1][1], 0,height, 1,0) ),
		        new THREE.Vector2( map(delaunay[i][2][0], 0,width, 0,1), map(delaunay[i][2][1], 0,height, 1,0) )
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
		this.camera.position.set(this.positionInitCam[0], this.positionInitCam[1], -400);
		this.camera.lookAt(new THREE.Vector3(this.centreCarte[0], this.centreCarte[1], -100));
		this.camera.up = new THREE.Vector3(0, 0, -1);
		this.scene.add(this.camera);
	
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(WIDTH, HEIGHT);
		this.renderer.setClearColor("#ffffff", 1);

		// LIGHT
		this.scene.add( new THREE.AmbientLight( 0x888888 ) );

		var spot1 = new THREE.DirectionalLight( 0x1111cc, 1 );
		spot1.position.set( -200, 0, -200 );
		this.scene.add(spot1);

		var spot2 = new THREE.DirectionalLight( 0xcc1111, 0.4 );
		spot2.position.set( 200, 0, -200 );
		this.scene.add(spot2);



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
		//this.camera.position.z = map(event.clientY, 0, window.innerHeight, 0, -1000);
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
		this.camera.lookAt( new THREE.Vector3(this.centreCarte[0], this.centreCarte[1], -100) );

	}


	

	
}














