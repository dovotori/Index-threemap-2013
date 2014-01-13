
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
var centroid2d;






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
	centroid2d = [];


	ajoutDesPointsDuFormatDeLaCarte();
	//ajoutDesPointsDesFrontieresDesPays();
	dessinDeLaCarteTexture(results[0], results[1]);

	// creation de la texture THREE
	var textureCarted3js = new THREE.Texture( creationCanvasTexture() );
	textureCarted3js.needsUpdate = true;

	// dessin 3d
	canvas = new Canvas();
	canvas.setup(window.innerWidth, window.innerHeight);
	
	dessin = new Dessin();
	dessin.setup(canvas.scene, textureCarted3js);
	
	//document.addEventListener("click", changerAnnee, false);

	animate();

	
}



function animate()
{

	requestAnimationFrame(animate);	
	dessin.draw(canvas.scene);
	canvas.draw();
	
}












/////////////////////////////////////////////
//////////// D3 ////////////////////////////
////////////////////////////////////////////

function dessinDeLaCarteTexture(results0, results1)
{


	// dessin de la carte avec d3
	var svg = d3.select("#conteneur").append("svg")
		.attr("width", width)
	    .attr("height", height)
	    .attr("id","svg");

	    
	var carted3js = svg.attr("id", "carted3js");
	carted3js.selectAll("path").data(results0.features).enter()
		.append("svg:path")
		.attr("id", function(d){ return d.id; })
		.attr("d", path)
		.style("stroke", "#fff")
		.style("stroke-width", "1px")
		.style("fill", "rgba(200,200,200,1)")
		.each(function(d){  

			// verifie si le pays est indexé
			for(var i = 0; i < results1.length; i++)
			{

				// affecte la hauteur;
				if(results1[i].iso == d.id)
				{

					// creer la liste des pays
					d3.select("#classement").append("p").attr("class", "itemPays")
						.style("position", "absolute")
						.style("top", (results1[i].an2013*20)+"px")
						.attr("id", results1[i].iso)
						.text("#"+results1[i].an2013+" / "+results1[i].name);
					

					// ajout dans les centroids
					var centroidTemporaire = path.centroid(d);
					var hauteur = map(results1[i].an2013, 0, 180, 0, 20);
					centroid.push( [ centroidTemporaire[0], centroidTemporaire[1], -hauteur*1.4 ] );
					centroid2d.push({ x: centroidTemporaire[0], y: centroidTemporaire[1], z: -hauteur*1.4 });

				}
			}

		});
}





function ajoutDesPointsDuFormatDeLaCarte()
{
	var HG = projection([-180,	84]);
	var HD = projection([180,	84]);
	var BD = projection([180,	-84]);
	var BG = projection([-180,	-84]);
	var MG = projection([-180,	0]);
	var MD = projection([180,	0]);

	centroid.push( [ HG[0] , HG[1] , 0 ]);
	centroid.push( [ HD[0] , HD[1] , 0 ]);
	centroid.push( [ MG[0] , MG[1] , 0 ]);
	centroid.push( [ MD[0] , MD[1] , 0 ]);
	centroid.push( [ BG[0] , BG[1] , 0 ]);
	centroid.push( [ BD[0] , BD[1] , 0 ]);

	centroid2d.push({ x: HG[0], y: HG[1], z:0 });
	centroid2d.push({ x: HD[0], y: HD[1], z:0 });
	centroid2d.push({ x: MG[0], y: MG[1], z:0 });
	centroid2d.push({ x: MD[0], y: MD[1], z:0 });
	centroid2d.push({ x: BG[0], y: BG[1], z:0 });
	centroid2d.push({ x: BD[0], y: BD[1], z:0 });


	var nbPointsParCote = 20;
	for(var i = 1; i < nbPointsParCote-1; i++)
	{
		var pointLigneHaut = projection([map(i, 0, nbPointsParCote, -180, 180),	84]);
		var pointLigneBas = projection([map(i, 0, nbPointsParCote, -180, 180),	-84]);
		var pointLigneGauche = projection([ -180, map(i, 0, nbPointsParCote, -84, 84)]);
		var pointLigneDroite = projection([ 180, map(i, 0, nbPointsParCote, -84, 84)]);

		centroid.push( [ pointLigneHaut[0] , pointLigneHaut[1] , 0 ]);
		centroid.push( [ pointLigneBas[0] , pointLigneBas[1] , 0 ]);
		centroid.push( [ pointLigneGauche[0] , pointLigneGauche[1] , 0 ]);
		centroid.push( [ pointLigneDroite[0] , pointLigneDroite[1] , 0 ]);


		centroid2d.push({ x: pointLigneHaut[0] , 	y:pointLigneHaut[1], z:0 });
		centroid2d.push({ x: pointLigneBas[0] , 	y:pointLigneBas[1], z:0 });
		centroid2d.push({ x: pointLigneGauche[0] , y:pointLigneGauche[1], z:0 });
		centroid2d.push({ x: pointLigneDroite[0] , y:pointLigneDroite[1], z:0 });
	}
}




function ajoutDesPointsDesFrontieresDesPays()
{

	// lire le svg avec les nouveaux points
	var obj = document.getElementById("object");
	console.log(obj.contentDocument);
	
	var svg = obj.contentDocument;
	
	var polygons = svg.getElementsByTagName("polygon");
	
	for(var i = 0; i < polygons.length; i++)
	{
		var strPoints = polygons[i].getAttribute("points");
		strPoints = strPoints.replace(/\s{2,}/g, " ");	// supprime double espace
		strPoints = strPoints.replace(/\t/g, "");		// supprime tabulation
		strPoints = strPoints.replace(/,/g, " ");		// supprime virgule

		var points = strPoints.split(" ");

		for(var j = 0; j < points.length-1; j += 2)		// car dernier element vide
		{

			var extraPoint = projection([ points[j], points[j+1] ]);
			//centroid2d.push({ x: extraPoint[0], y: extraPoint[1], z: 0 });
			//centroid.push( [ extraPoint[0] , extraPoint[1] , 0 ]);

		}
		
	}
}



function creationCanvasTexture()
{
	
	var svgImg = document.getElementById("carted3js");

    // transforme le svg en image
    var xml = new XMLSerializer().serializeToString(svgImg);
	var data2 = "data:image/svg+xml;base64," + btoa(xml);
	
	imageTexture = new Image(); 
	imageTexture.setAttribute('src', data2);

	// creation du canvas 2d
	var canvas2d = document.createElement( "canvas" );
	canvas2d.width = width;
	canvas2d.height = height;

	var context = canvas2d.getContext( '2d' );

	context.drawImage(imageTexture, 0, 0);
	imageTextureData = context.getImageData( 0, 0, width, height );
	context.putImageData( imageTextureData, 0, 0 );
	//document.body.appendChild(canvas2d);

	return canvas2d;
}












/////////////////////////////////////////////
//////////// THREE /////////////////////////
////////////////////////////////////////////

var Dessin = function()
{
	this.materialMesh;
	this.mesh;



	this.setup = function(scene, textureCarted3js)
	{
		
		//MATERIAL
		this.materialMesh = new THREE.MeshLambertMaterial({ 
	    	//map: textureCarted3js,
	    	color:0xffee99,
	    	side: THREE.DoubleSide,
	    	//wireframe: true, 
	    	//wireframeLinewidth: 1
	    	//morphTargets: true
	    });

	    this.materialParticule = new THREE.ParticleBasicMaterial({
      		color: 0xFF0000,
      		size: 4
    	});




    	var delaunay = d3.geom.delaunay(centroid);
		var delaunay2 = triangulate(centroid2d);

	    geometrie = new THREE.Geometry();

	    for (var i=0; i < delaunay2.length; i++ )
	    {
	    	geometrie.vertices.push(new THREE.Vector3(delaunay2[i].a.x, delaunay2[i].a.y, delaunay2[i].a.z));
	    	geometrie.vertices.push(new THREE.Vector3(delaunay2[i].b.x, delaunay2[i].b.y, delaunay2[i].b.z));
	    	geometrie.vertices.push(new THREE.Vector3(delaunay2[i].c.x, delaunay2[i].c.y, delaunay2[i].c.z));
	    	geometrie.faces.push( new THREE.Face3( 3*i, 1+3*i, 2+3*i ));

	    	geometrie.faceVertexUvs[0].push([
		        new THREE.Vector2( map(delaunay2[i].a.x, 0,width, 0,1), map(delaunay2[i].a.y, 0,height, 1,0) ),
		        new THREE.Vector2( map(delaunay2[i].b.x, 0,width, 0,1), map(delaunay2[i].b.y, 0,height, 1,0) ),
		        new THREE.Vector2( map(delaunay2[i].c.x, 0,width, 0,1), map(delaunay2[i].c.y, 0,height, 1,0) )
	        ]);

	  		// geometrie.vertices.push(new THREE.Vector3(delaunay[i][0][0], delaunay[i][0][1], delaunay[i][0][2]));
			// geometrie.vertices.push(new THREE.Vector3(delaunay[i][1][0], delaunay[i][1][1], delaunay[i][1][2]));
			// geometrie.vertices.push(new THREE.Vector3(delaunay[i][2][0], delaunay[i][2][1], delaunay[i][2][2]));
			// geometrie.faces.push( new THREE.Face3( 3*i, 1+3*i, 2+3*i ));

		 //    geometrie.faceVertexUvs[0].push([
		 //        new THREE.Vector2( map(delaunay[i][0][0], 0,width, 0,1), map(delaunay[i][0][1], 0,height, 1,0) ),
		 //        new THREE.Vector2( map(delaunay[i][1][0], 0,width, 0,1), map(delaunay[i][1][1], 0,height, 1,0) ),
		 //        new THREE.Vector2( map(delaunay[i][2][0], 0,width, 0,1), map(delaunay[i][2][1], 0,height, 1,0) )
	  //       ]);

	    }

	    geometrie.computeFaceNormals();

	    this.mesh = new THREE.Mesh(geometrie, this.materialMesh);
	    this.mesh.doubleSided = true;		
	    scene.add(this.mesh);

		// var particleSystem = new THREE.ParticleSystem( geometrie, this.materialParticule );
		// scene.add(particleSystem);
		
	}




	this.draw = function(scene)
	{		

		
	    //this.mesh.geometry.verticesNeedUpdate = true;

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
	this.spot1;
	this.spot2;
	this.largeurFenetre; 
	this.hauteurFenetre;



	this.setup = function(WIDTH, HEIGHT)
	{

		var VIEW_ANGLE = 45,
		    ASPECT = WIDTH / HEIGHT,
		    NEAR = 0.1,
		    FAR = 10000;


		this.scrollSouris = 100;
		this.centreCarte = projection([0,0]);
		this.positionInitCam = projection([0,-89]);
		this.largeurFenetre = 1200;
		this.hauteurFenetre = 800;

		this.scene = new THREE.Scene();

		//this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
		this.camera = new THREE.OrthographicCamera( this.largeurFenetre / - 2, this.largeurFenetre / 2, this.hauteurFenetre / 2, this.hauteurFenetre / - 2, 1, 10000 );
		this.camera.position.set(this.positionInitCam[0], this.positionInitCam[1], -600);
		this.camera.lookAt(new THREE.Vector3(this.centreCarte[0], this.centreCarte[1], -100));
		this.camera.up = new THREE.Vector3(0, 0, -1);
		this.scene.add(this.camera);
	
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(WIDTH, HEIGHT);
		this.renderer.setClearColor("#ffffff", 1);

		// LIGHT
		this.scene.add( new THREE.AmbientLight( 0x888888 ) );

		this.spot1 = new THREE.DirectionalLight( 0x1111cc, 1 );
		this.spot1.position.set( -200, 0, -200 );
		this.scene.add(this.spot1);

		this.spot2 = new THREE.DirectionalLight( 0xcc1111, 0.4 );
		this.spot2.position.set( 200, 0, -200 );
		this.scene.add(this.spot2);


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
		//this.spot2.position.x = map(event.clientY, 0, window.innerHeight, -1000, 1000);
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







//////////////////////////////////////
///////////// CHANGER ANNEE /////////
////////////////////////////////////

function changerAnnee()
{

	queue()
		.defer(lireCsv, "index2013.csv")
		.awaitAll(readyChangementAnnee);

}




function readyChangementAnnee(errors, results)
{

	for(var i = 0; i < results[0].length; i++)
	{
		var iso = results[0][i].iso;
		var item = d3.select("#"+iso);
		//item.style("top", (results[0][i].an2012*20)+"px");
		//item.style("color", "red");
	}

	//var items = d3.selectAll(".itemPays");
	var items = d3.select("#FIN");
	items.style("color", "red");

	dessin.redraw();


}







