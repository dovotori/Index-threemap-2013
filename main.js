
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


var pointsStructure;
var infosPays;
var currentYear;
var hauteurMax;





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
		.defer(lireCsv, "index.csv")
		.awaitAll(ready);
	
}


function ready(error, results) 
{

	pointsStructure = [];
	infosPays = [];	// [ iso,idForme, [classementAnnee], [centroid] ] 
	currentYear = 0;
	hauteurMax = 20.0;


	ajoutDesPointsDuFormatDeLaCarte();
	ajoutDesPointsDesFrontieresDesPays();
	dessinDeLaCarteTexture(results[0], results[1]);



	// creation de la texture THREE
	var textureCarted3js = new THREE.Texture( creationCanvasTexture() );
	textureCarted3js.needsUpdate = true;

	// dessin 3d
	canvas = new Canvas();
	canvas.setup(window.innerWidth, window.innerHeight);
	
	dessin = new Dessin();
	dessin.setup(canvas.scene, textureCarted3js);

	var btn_suivant = document.getElementById("btn_suivant");
	var btn_precedent = document.getElementById("btn_precedent");
	btn_suivant.addEventListener("click", function(){ changerAnnee(-1); }, false);
	btn_precedent.addEventListener("click", function(){ changerAnnee(1); }, false);


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


function ajoutDesPointsDuFormatDeLaCarte()
{

	var HG = projection([-180,	84]);
	var HD = projection([180,	84]);
	var BD = projection([180,	-84]);
	var BG = projection([-180,	-84]);
	var MG = projection([-180,	0]);
	var MD = projection([180,	0]);

	pointsStructure.push({ x: HG[0], y: HG[1], z:0 });
	pointsStructure.push({ x: HD[0], y: HD[1], z:0 });
	pointsStructure.push({ x: MG[0], y: MG[1], z:0 });
	pointsStructure.push({ x: MD[0], y: MD[1], z:0 });
	pointsStructure.push({ x: BG[0], y: BG[1], z:0 });
	pointsStructure.push({ x: BD[0], y: BD[1], z:0 });

	// pointsStructure.push( [ HG[0] , HG[1] , 0 ]);
	// pointsStructure.push( [ HD[0] , HD[1] , 0 ]);
	// pointsStructure.push( [ MG[0] , MG[1] , 0 ]);
	// pointsStructure.push( [ MD[0] , MD[1] , 0 ]);
	// pointsStructure.push( [ BG[0] , BG[1] , 0 ]);
	// pointsStructure.push( [ BD[0] , BD[1] , 0 ]);


	var nbPointsParCote = 20;
	for(var i = 1; i < nbPointsParCote-1; i++)
	{
		var pointLigneHaut = projection([map(i, 0, nbPointsParCote, -180, 180),	84]);
		var pointLigneBas = projection([map(i, 0, nbPointsParCote, -180, 180),	-84]);
		var pointLigneGauche = projection([ -180, map(i, 0, nbPointsParCote, -84, 84)]);
		var pointLigneDroite = projection([ 180, map(i, 0, nbPointsParCote, -84, 84)]);

		pointsStructure.push({ x: pointLigneHaut[0] , 	y:pointLigneHaut[1], z:0 });
		pointsStructure.push({ x: pointLigneBas[0] , 	y:pointLigneBas[1], z:0 });
		pointsStructure.push({ x: pointLigneGauche[0] , y:pointLigneGauche[1], z:0 });
		pointsStructure.push({ x: pointLigneDroite[0] , y:pointLigneDroite[1], z:0 });

		// pointsStructure.push([ pointLigneHaut[0], pointLigneHaut[1], 0 ]);
		// pointsStructure.push([ pointLigneBas[0], pointLigneBas[1], 0 ]);
		// pointsStructure.push([ pointLigneGauche[0], pointLigneGauche[1], 0 ]);
		// pointsStructure.push([ pointLigneDroite[0], pointLigneDroite[1], 0 ]);
	}
}







function dessinDeLaCarteTexture(results0, results1)
{

	var cptId = pointsStructure.length;


	// dessin de la carte avec d3
	var carted3js = d3.select("#conteneur").append("svg")
		.attr("width", width)
	    .attr("height", height)
	    .style("background-color", "#555")
	    .attr("id","carted3js");


	carted3js.selectAll("path")
		.data(results0.features).enter()
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
						.text(results1[i].name)
						.on("click", function(){ clickPays(this.id); });
					

					// ajout des capitales
					var latitude = results1[i].latitude;
					var longitude = results1[i].longitude;

					if(latitude != "#N/A" && longitude != "#N/A")
					{
						var lat = parseFloat(latitude.substring(0, latitude.length-1));
						var sens = latitude.substring(latitude.length-1, latitude.length);
						if(sens == "S"){ lat *= -1; }

						var long = parseFloat(longitude.substring(0, longitude.length-1));
						sens = longitude.substring(longitude.length-1, longitude.length);
						if(sens == "W"){ long *= -1; }

						coordonneesCapitale = [ long, lat ];
						var traductionCoor = projection(coordonneesCapitale);
						var x = traductionCoor[0];
						var y = traductionCoor[1];
						
						pointsStructure.push({ x: x, y: y, z: -map(results1[i].an2013, 180, 0, 0, hauteurMax) });
						//pointsStructure.push([ x, y, --map(results1[i].an2013, 0, 180, 0, 40) ]);
						infosPays.push([ d.id, cptId, [ parseInt(results1[i].an2013),  parseInt(results1[i].an2012)], [ x, y ] ]);
						cptId++;
					}

					// ajout des centroids
					// var centroidTemporaire = path.centroid(d);
					// pointsStructure.push({ x: centroidTemporaire[0], y: centroidTemporaire[1], z: -map(results1[i].an2013, 0, 180, 0, 40) });
					// infosPays.push([ d.id, cptId, parseInt(results1[i].an2013) ]);
					// cptId++;

				}
			}

		});

		
}









function ajoutDesPointsDesFrontieresDesPays()
{

	// lire le svg avec les nouveaux points
	var obj = document.getElementById("object");
	
	var svg = obj.contentDocument;
	

	// polygons
	var polygons = svg.getElementsByTagName("polygon");
	var cpt = 0;
	
	if(polygons.length > 0)
	{
		for(var i = 0; i < polygons.length; i++)
		{
			var strPoints = polygons[i].getAttribute("points");
			strPoints = strPoints.replace(/\s{2,}/g, " ");	// supprime double espace
			strPoints = strPoints.replace(/\t/g, "");		// supprime tabulation
			strPoints = strPoints.replace(/,/g, " ");		// supprime virgule

			var points = strPoints.split(" ");

			for(var j = 0; j < points.length-1; j += 2)		// car dernier element vide
			{
				if(points[j+1] >= 84){ points[j+1] = 84; } 
				if(points[j+1] <= -84){ points[j+1] = -84; } 
				var extraPoint = projection([ points[j], points[j+1] ]);
				pointsStructure.push({ x: extraPoint[0], y: extraPoint[1], z: 0 });	
			}
		}	
	}



	
	// path
	var paths = svg.getElementsByTagName("path");
	for(var i = 0; i < paths.length; i++) 
	{
		var strPath = paths[i].getAttribute("d");
		strPath = strPath.replace(/[ZzVvMmHhCcSs,Ll]/g, " ");
		strPath = strPath.replace(/-/g," -");
		strPath = strPath.replace(/  /g, " ");
		strPath = strPath.replace(/  /g, " ");
		strPath = strPath.replace(/  /g, " ");
		strPath = strPath.replace(/  /g, " ");
		
		//console.log(strPath);
		points = strPath.split(" ");

		var cpt = 0;
		for(var j = 0; j < points.length; j+=2) // dernier vide
		{
			console.log(points[j]);
			//console.log(points[j]+" "+points[j+1]);

			if(points[j+1] >= 84){ points[j+1] = 84; } 
			if(points[j+1] <= -84){ points[j+1] = -84; } 

			var extraPoint = projection([ points[j], points[j+1] ]);
			pointsStructure.push({ x: extraPoint[0], y: extraPoint[1], z: 0 });
			//console.log(extraPoint[0]+" / "+extraPoint[1]);
		}
	}

}









function creationCanvasTexture()
{

	var svgImg = document.getElementById("carted3js");

    // transforme le svg en image
    var xml = new XMLSerializer().serializeToString(svgImg);
	var data2 = "data:image/svg+xml;base64," + btoa(xml);
	
	var imageTexture = new Image(); 
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
	this.materialParticule;
	this.materialLine;
	this.materialShader;

	this.mesh;
	this.transition;
	this.lines;

	this.uniforms;



	this.setup = function(scene, textureCarted3js)
	{
		this.transition = [];
		this.lines = [];


		this.setupMaterials(textureCarted3js);


	    // TRANSITION
	    for(var i =0; i < infosPays.length; i++)
	    {
	    	this.transition[i] = new Transition();
	    }



	    // DESSIN
	    geometrie = new THREE.Geometry();

	    for (var i = 0; i < pointsStructure.length; i++ )
	    {
			geometrie.vertices.push({ x: pointsStructure[i].x, y: pointsStructure[i].y, z: pointsStructure[i].z });
			//geometrie.vertices.push({ x: pointsStructure[i][0], y: pointsStructure[i][1], z: pointsStructure[i][2] });
		}

		var delaunay = triangulate(pointsStructure);
		//var delaunay = d3.geom.delaunay(pointsStructure);

		
		for (var i=0; i < delaunay.length; i++ )
		{
			// trouver les ids des vertices de chaque triangles
			var id_a, id_b, id_c;
			for(var k = 0; k < geometrie.vertices.length; k++ )
			{
				//if(delaunay[i][0][0] == geometrie.vertices[k].x && delaunay[i][0][1] == geometrie.vertices[k].y && delaunay[i][0][2] == geometrie.vertices[k].z)
				if(delaunay[i].a.x == geometrie.vertices[k].x && delaunay[i].a.y == geometrie.vertices[k].y && delaunay[i].a.z == geometrie.vertices[k].z)
				{
					id_a = k;
				}
				//if(delaunay[i][1][0] == geometrie.vertices[k].x && delaunay[i][1][1] == geometrie.vertices[k].y && delaunay[i][1][2] == geometrie.vertices[k].z)
				if(delaunay[i].b.x == geometrie.vertices[k].x && delaunay[i].b.y == geometrie.vertices[k].y && delaunay[i].b.z == geometrie.vertices[k].z)
				{
					id_b = k;
				}
				//if(delaunay[i][2][0] == geometrie.vertices[k].x && delaunay[i][2][1] == geometrie.vertices[k].y && delaunay[i][2][2] == geometrie.vertices[k].z)
				if(delaunay[i].c.x == geometrie.vertices[k].x && delaunay[i].c.y == geometrie.vertices[k].y && delaunay[i].c.z == geometrie.vertices[k].z)
				{
					id_c = k;
				}
			}
			geometrie.faces.push( new THREE.Face3( id_a, id_b, id_c ));

			// coordonnees de textures
			geometrie.faceVertexUvs[0].push([
		        new THREE.Vector2( map(geometrie.vertices[id_a].x, 0,width, 0,1), map(geometrie.vertices[id_a].y, 0,height, 1,0) ),
		        new THREE.Vector2( map(geometrie.vertices[id_b].x, 0,width, 0,1), map(geometrie.vertices[id_b].y, 0,height, 1,0) ),
		        new THREE.Vector2( map(geometrie.vertices[id_c].x, 0,width, 0,1), map(geometrie.vertices[id_c].y, 0,height, 1,0) )
	        ]);
		}

		geometrie.computeFaceNormals();




	    this.mesh = new THREE.Mesh(geometrie, this.materialShader);
	    this.mesh.doubleSided = true;		
	    scene.add(this.mesh);
		
	  	// var particleSystem = new THREE.ParticleSystem( geometrie, this.materialParticule );
 		// scene.add(particleSystem);

		//this.drawLines(scene);
	}



	this.setupMaterials = function(textureCarted3js)
	{
		//MATERIAL
		this.materialMesh = new THREE.MeshLambertMaterial({ 
	    	//map: textureCarted3js,
	    	//color:0xffee99,
	    	side: THREE.DoubleSide,
	    	//wireframe: true, 
	    	//wireframeLinewidth: 1
	    	//morphTargets: true
	    	vertexColors: THREE.VertexColors
	    });

	    this.materialParticule = new THREE.ParticleBasicMaterial({
      		color: 0xFF0000,
      		size: 4
    	});

    	this.materialLine = new THREE.LineBasicMaterial({ 
    		color:0x0000ff,
    		transparent: true, 
    		opacity: 0.3
    	});


		var attributes = {};

		this.uniforms = {
			delta: 	{type: 'f', value: 0.0},
			scale: 	{type: 'f', value: 1.0},
			alpha: 	{type: 'f', value: 1.0},
			texture:  { type: 't', value: textureCarted3js },
			noise: 	{ type:'f', value: 0.04 },
			lightPos: { type:'v3', value: new THREE.Vector3(0.5, 0.2, -10.0) },
			hauteurMax: { type: 'f', value: hauteurMax }

			//tDiffuse:  { type: "t", value: textureCarted3js },
			//exposure:  { type: "f", value: 1.5 },
			//brightMax: { type: "f", value: 1.5 },

		};


    	this.materialShader = new THREE.ShaderMaterial({
		  uniforms: this.uniforms,
		  attributes: attributes,
		  vertexShader: document.getElementById('vertexShader').textContent,
		  fragmentShader: document.getElementById('fragmentShader').textContent
		});
		
	}



	this.drawLines = function(scene)
	{
		for(var i = 0; i < infosPays.length; i++)
      	{
			var geometrie = new THREE.Geometry();
			geometrie.vertices.push(new THREE.Vector3(this.mesh.geometry.vertices[infosPays[i][1]].x, this.mesh.geometry.vertices[infosPays[i][1]].y, this.mesh.geometry.vertices[infosPays[i][1]].z));
			geometrie.vertices.push(new THREE.Vector3(this.mesh.geometry.vertices[infosPays[i][1]].x, this.mesh.geometry.vertices[infosPays[i][1]].y, (this.mesh.geometry.vertices[infosPays[i][1]].z*40)-50));
			geometrie.vertices.push(new THREE.Vector3(0, this.mesh.geometry.vertices[infosPays[i][1]].y, (this.mesh.geometry.vertices[infosPays[i][1]].z*40)-50));
			this.lines[i] = new THREE.Line(geometrie, this.materialLine);
			scene.add(this.lines[i]);
		}
	}



	this.draw = function(scene)
	{		

		this.uniforms.delta.value += 0.1;
		//this.uniforms.lightPos.value = new THREE.Vector3(this.spot2.position.x, this.spot2.position.y, this.spot2.position.z);

		if(!this.transition[0].isFinished)
      	{
      		for(var i = 0; i < infosPays.length; i++)
      		{
				this.mesh.geometry.vertices[infosPays[i][1]].z = this.transition[i].execute();

			}
			this.mesh.geometry.verticesNeedUpdate = true;
			
      	}

	}






	this.changementAnnee = function(scene)
	{

		for(var i = 0; i < infosPays.length; i++)
      	{
      		//this.lines[i].
			this.transition[i].setup( this.mesh.geometry.vertices[infosPays[i][1]].z, -map(infosPays[i][2][currentYear], 180, 0, 0, hauteurMax ));
			this.transition[i].setTween(1);
			this.transition[i].setSpeed(0.1);
		}

	}


	this.drawLine = function(paysId)
	{
		console.log(paysId);
	}

	
}




















/////////////////////////////////////////////
//////////// CANVAS ////////////////////////
////////////////////////////////////////////

var Canvas = function()
{

	this.renderer;
	this.scene;
	this.centreCarte;
	this.positionInitCam;

	this.xSouris; this.scrollSouris;
	
	this.spot1; this.spot2;
	this.repereCube;

	this.focusCamera;
	this.angleSpot;

	this.camera;
	this.transitionCamera;


	this.setup = function(WIDTH, HEIGHT)
	{

		var VIEW_ANGLE = 45,
		    ASPECT = WIDTH / HEIGHT,
		    NEAR = 0.1,
		    FAR = 10000;


		this.scrollSouris = 100;
		this.centreCarte = projection([0,0]);
		this.positionInitCam = projection([ 0, -89 ]);
		this.largeurFenetre = 1200;
		this.hauteurFenetre = 800;
		this.angleSpot = 0;

		// SCENE
		this.scene = new THREE.Scene();
		this.scene.fog = new THREE.Fog( 0x000000, 1, FAR/8 );

		// CAMERA
		this.transitionCamera = new Transition();
		this.focusCamera = [this.centreCarte[0], this.centreCarte[1], -100];
		this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
		//this.camera = new THREE.OrthographicCamera( this.largeurFenetre / - 2, this.largeurFenetre / 2, this.hauteurFenetre / 2, this.hauteurFenetre / - 2, 1, 10000 );
		this.camera.position.set(this.positionInitCam[0], this.positionInitCam[1], -400);
		this.camera.lookAt(new THREE.Vector3(this.focusCamera[0], this.focusCamera[1], this.focusCamera[2]));
		this.camera.up = new THREE.Vector3(0, 0, -1);
		this.scene.add(this.camera);
	
		// RENDERER
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(WIDTH, HEIGHT);
		this.renderer.setClearColor("#ffffff", 1);

		// LIGHT
		this.scene.add( new THREE.AmbientLight( 0x888888 ) );

		this.spot1 = new THREE.DirectionalLight( 0x1111cc, 1 );
		this.spot1.position.set( -200, 0, -200 );
		this.scene.add(this.spot1);

		this.spot2 = new THREE.DirectionalLight( 0xffffff, 0.4 );
		this.spot2.position.set( 200, 0, -200 );
		this.scene.add(this.spot2);

		this.repereCube = new THREE.Mesh(new THREE.CubeGeometry(10, 10, 10), new THREE.MeshNormalMaterial({ color: 0xff0000 }));
    	this.repereCube.overdraw = true;
    	this.repereCube.position.set(this.spot1.position.x, this.spot1.position.y, this.spot1.position.z);
    	this.scene.add(this.repereCube);




		document.body.appendChild(this.renderer.domElement);
		
		var clone = this;
		document.addEventListener("mousemove", function(event){ clone.onMouseMove(event); }, false);
		//document.addEventListener("mousewheel", function(event){ clone.onMouseScroll(event); }, false);
		//document.addEventListener("DOMMouseScroll", function(event){ clone.onMouseScroll(event); }, false);

	}
	
	
	this.draw = function()
	{
		//this.positionSpot();

		if(!this.transitionCamera.isFinished)
		{

			var currentPos = this.transitionCamera.execute3d();
			console.log(currentPos[0]+" "+currentPos[1]+" "+currentPos[2]);
			this.camera.position.x = currentPos[0];
			this.camera.position.y = currentPos[1];
			this.camera.position.z = currentPos[3];
		}
		this.camera.lookAt(new THREE.Vector3(this.focusCamera[0], this.focusCamera[1], this.focusCamera[2]));

		this.renderer.render(this.scene, this.camera);

	}
	
	
	this.onMouseMove = function(event)
	{
		this.xSouris = event.clientX;
		 var ySouris = event.clientY;
		 this.camera.position.x = map(this.xSouris, 0, window.innerWidth, -1000, 1000);
		 this.camera.position.z = map(ySouris, 0, window.innerHeight, -1000, 1000);

		//this.positionCamera();
		return false;
	}



	this.onMouseScroll = function(e) {

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

		var rayon = projection([180,0])[1];
		var centre = this.focusCamera;
		var angle = map(this.xSouris, 0, largeurFenetre, 0, 180);

		var x = (Math.cos(angle*(Math.PI/180)) * rayon) + centre[0];
		var y = (Math.sin(angle*(Math.PI/180)) * rayon) + centre[1];
		
		this.camera.position.x = x;
		this.camera.position.y = y;
		this.camera.lookAt( new THREE.Vector3(this.focusCamera[0], this.focusCamera[1], this.focusCamera[2]) );


		// lumiere opposée par rapport a la camera
		x = (Math.cos((angle+180)*(Math.PI/180)) * rayon) + centre[0];
		y = (Math.sin((angle+180)*(Math.PI/180)) * rayon) + centre[1];
		this.spot2.position.x = x;
		this.spot2.position.y = y;
		this.repereCube.position.x = x;
		this.repereCube.position.y = y;
		this.repereCube.position.z = 0;

	}




	this.positionSpot = function()
	{
		this.angleSpot++;
		var rayon = 1000;
		var centre = this.centreCarte;

		var x = (Math.cos(this.angleSpot*(Math.PI/180)) * rayon)+centre[0];
		var y = (Math.sin(this.angleSpot*(Math.PI/180)) * rayon)+centre[1];

		this.repereCube.position.x = x;
		this.spot2.position.x = x;
		this.repereCube.position.y = y;
		this.spot2.position.y = y;
	}



	this.moveCamToPays = function(paysId)
	{


		this.camera.position.x = infosPays[paysId][3][0];
		this.camera.position.y = infosPays[paysId][3][1]+100;
		this.camera.position.z = -200;

		this.focusCamera = [ infosPays[paysId][3][0], infosPays[paysId][3][1], -10 ];
		//console.log(this.camera.position.x+" / "+this.camera.position.y+" / "+this.camera.position.z);
		//this.transitionCamera.setup([this.camera.position.x,this.camera.position.y,this.camera.position.z], [ infosPays[paysId][3][0], infosPays[paysId][3][1]+100, -200 ]);
		

	}

	
}




















//////////////////////////////////////
///////////// INTERACTION /////////
////////////////////////////////////

function changerAnnee(sens)
{

	if(sens > 0 && currentYear < 1)
	{
		currentYear++;
	} else if(sens < 0 && currentYear >= 1){
		currentYear--;
	}


	var displayYear = document.getElementById("current_year");
	displayYear.innerHTML = 2013-currentYear;


	// reclasser liste
	var classement = d3.select("#classement");
	for(var i = 0; i < infosPays.length; i++)
	{
		classement.select("#"+infosPays[i][0])
			.transition().duration(700)
			.style("top", (infosPays[i][2][currentYear]*20)+"px");
	}

	dessin.changementAnnee();

}




function clickPays(isoPays)
{
	var id;
	for(var i = 0; i < infosPays.length; i++)
	{
		if(isoPays == infosPays[i][0])
		{
			id = i;
		}
	}

	canvas.moveCamToPays(id);
	dessin.drawLine(id);

}






