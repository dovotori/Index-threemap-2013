
window.addEventListener("load", setup, false);



var width = window.innerWidth;
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
	infosPays = [];	// [ iso,idForme, [classementAnnee], [centroid], name ] 
	currentYear = 0;
	hauteurMax = 20.0;

	ajoutDesPointsDuFormatDeLaCarte();
	ajoutDesPointsDesFrontieresDesPays();
	dessinDeLaCarteTexture(results[0], results[1]);

	// creation de la texture THREE
	var textureCarted3js = new THREE.Texture( creationCanvasTexture() );
	textureCarted3js.needsUpdate = true;

	// scene 3d
	canvas = new Canvas();
	canvas.setup(window.innerWidth, window.innerHeight);
	
	// dessin 3d
	dessin = new Dessin();
	dessin.setup(canvas.scene, textureCarted3js);

	var btn_suivant = document.getElementById("btn_suivant");
	var btn_precedent = document.getElementById("btn_precedent");
	var btn_retour = document.getElementById("current_year");
	btn_suivant.addEventListener("click", function(){ changerAnnee(-1); }, false);
	btn_precedent.addEventListener("click", function(){ changerAnnee(1); }, false);
	btn_retour.addEventListener("click", function(){ init(); }, false);

	changerAnnee(-1);	

	//setTimeout(animate, 5000);
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
						infosPays.push([ d.id, cptId, [ parseInt(results1[i].an2013),  parseInt(results1[i].an2012)], [ x, y ], results1[i].name ]);
						cptId++;
					}

					// ajout des centroids
					// var centroidTemporaire = path.centroid(d);
					// pointsStructure.push({ x: centroidTemporaire[0], y: centroidTemporaire[1], z: -map(results1[i].an2013, 0, 180, 0, 40) });
					// infosPays.push([ d.id, cptId, parseInt(results1[i].an2013) ]);
					// cptId++;


					// creer la liste des pays
					d3.select("#classement").append("p").attr("class", "itemPays")
						.style("position", "absolute")
						.attr("id", results1[i].iso)
						.on("click", function(){ clickPays(this.id); });



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
	this.line;
	this.transitionLine;

	this.uniforms;



	this.setup = function(scene, textureCarted3js)
	{
		
		// TRANSITION
		this.transitionLine = new Transition();
		this.transition = [];
	    for(var i =0; i < infosPays.length; i++)
	    {
	    	this.transition[i] = new Transition();
	    }

	    // MATERIAL
		this.setupMaterials(textureCarted3js);

	    // DESSIN
	    this.lines = [];

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

		var geometrieLine = new THREE.Geometry();
		geometrieLine.vertices.push(new THREE.Vector3(0, 0, 0));
		geometrieLine.vertices.push(new THREE.Vector3(0, 0, 0));
		this.line = new THREE.Line(geometrieLine, this.materialLine);
		scene.add(this.line);

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






	this.setupMaterials = function(textureCarted3js)
	{
		//MATERIAL
		this.materialMesh = new THREE.MeshLambertMaterial({ 
	    	//map: textureCarted3js,
	    	//color:0xffee99,
	    	side: THREE.DoubleSide,
	    	//wireframe: true, 
	    	//wireframeLinewidth: 1
	    	vertexColors: THREE.VertexColors
	    });

	    this.materialParticule = new THREE.ParticleBasicMaterial({
      		color: 0xFF0000,
      		size: 4
    	});

    	this.materialLine = new THREE.LineBasicMaterial({ 
    		color:0xe2ff06b,
    		transparent: true, 
    		opacity: 0.4,
    		linewidth: 2
    	});

		var attributes = {};

		this.uniforms = {

			delta: 	{type: 'f', value: 0.0 },
			scale: 	{type: 'f', value: 1.0 },
			alpha: 	{type: 'f', value: 1.0 },
			texture:  { type: 't', value: textureCarted3js },
			noise: 	{ type:'f', value: 0.04 },
			lightPos: { type:'v3', value: new THREE.Vector3(0.5, 0.2, -10.0) },
			hauteurMax: { type: 'f', value: hauteurMax }

		};

    	this.materialShader = new THREE.ShaderMaterial({
		  uniforms: this.uniforms,
		  attributes: attributes,
		  vertexShader: document.getElementById('vertexShader').textContent,
		  fragmentShader: document.getElementById('fragmentShader').textContent,
		  transparent: true
		});
		
	}



	



	this.draw = function(scene)
	{		

		this.uniforms.delta.value += 0.1;

		if(!this.transition[0].isFinished)
      	{
      		for(var i = 0; i < infosPays.length; i++)
      		{
				this.mesh.geometry.vertices[infosPays[i][1]].z = this.transition[i].execute();

			}
			this.mesh.geometry.verticesNeedUpdate = true;	
      	}


      	if(!this.transitionLine.isFinished)
		{
			var currentPosition = this.transitionLine.execute();
			this.line.geometry.vertices[0].z = currentPosition;
			this.line.geometry.verticesNeedUpdate = true;
		}

	}




	this.changementAnnee = function(scene)
	{

		for(var i = 0; i < infosPays.length; i++)
      	{
			this.transition[i].setup( this.mesh.geometry.vertices[infosPays[i][1]].z, -map(infosPays[i][2][currentYear], 180, 0, 0, hauteurMax ));
			this.transition[i].setTween(1);
			this.transition[i].setSpeed(0.1);
		}

	}




	this.drawLine = function(paysId)
	{
		this.line.geometry.vertices[0] = new THREE.Vector3(infosPays[paysId][3][0], infosPays[paysId][3][1], -1000);
		this.line.geometry.vertices[1] = new THREE.Vector3(infosPays[paysId][3][0], infosPays[paysId][3][1], -1000);
		this.line.geometry.verticesNeedUpdate = true;
		this.transitionLine.setup(-400, 0);
	}


	this.deleteLine = function()
	{
		this.transitionLine.setup(0, -400);
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

	this.xSouris; this.scrollSouris; this.mouseDown;
	this.xSourisOld;
	
	this.spot1; this.spot2;
	this.angleSpot;

	this.repereCube;

	this.isZoom;

	this.camera;
	this.angleCamera;
	this.rayonCamera;
	this.positionInitCam;
	this.focusCamera;
	this.transitionCamera;
	this.transitionFocusCamera;


	this.setup = function(WIDTH, HEIGHT)
	{

		var VIEW_ANGLE = 45,
		    ASPECT = WIDTH / HEIGHT,
		    NEAR = 0.1,
		    FAR = 10000;


		this.mouseDown = false;
		this.scrollSouris = 100;
		this.centreCarte = projection([0,0]);
		this.angleSpot = 0;
		this.xSouris = 0; this.xSourisOld = 0;


		// SCENE
		this.scene = new THREE.Scene();
		this.scene.fog = new THREE.Fog( 0x000000, 1, FAR/8 );

		// CAMERA
		this.isZoom = false;
		this.angleCamera = 90;
		this.positionInitCam = projection([ 0, -84 ]);
		this.transitionCamera = new Transition();
		this.transitionFocusCamera = new Transition();
		this.focusCamera = [ this.centreCarte[0], this.centreCarte[1], -10 ];
		this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
		//this.camera = new THREE.OrthographicCamera( WIDTH / - 2, WIDTH / 2, HEIGHT / 2, HEIGHT / - 2, 1, 10000 );
		this.camera.up = new THREE.Vector3( 0, 0, -1 );

		this.rayonCamera = this.positionInitCam[1];
		var centre = this.focusCamera;
		var x = (Math.cos(this.angleCamera*(Math.PI/180)) * this.rayonCamera) + centre[0];
		var y = (Math.sin(this.angleCamera*(Math.PI/180)) * this.rayonCamera) + centre[1];
		this.rayonCamera = this.positionInitCam[1];
		this.camera.position.set( x, y, -200 );
		this.camera.lookAt(new THREE.Vector3( this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ));
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


		// REPERE CUBE
		// this.repereCube = new THREE.Mesh(new THREE.CubeGeometry(10, 10, 10), new THREE.MeshNormalMaterial({ color: 0xff0000 }));
  //   	this.repereCube.overdraw = true;
  //   	this.repereCube.position.set(0, 0, 0);
  //   	this.scene.add(this.repereCube);


    	var canvas = this.renderer.domElement;
		document.body.appendChild(canvas);
		
		var clone = this;
		canvas.addEventListener("mousemove", function(event){ clone.onMouseMove(event); }, false);
		canvas.addEventListener("mousedown", function(event){ clone.onMouseDown(event); }, false);
		canvas.addEventListener("mouseup", function(event){ clone.onMouseUp(event); }, false);
		//canvas.addEventListener("mousewheel", function(event){ clone.onMouseScroll(event); }, false);
		//canvas.addEventListener("DOMMouseScroll", function(event){ clone.onMouseScroll(event); }, false);

	}
	
	

	this.draw = function()
	{

		//this.positionSpot();
		
		// transition pour la poistion de la camera
		if(!this.transitionCamera.isFinished)
		{
			var currentPos = this.transitionCamera.execute3d();
			this.camera.position.set(currentPos[0], currentPos[1], currentPos[2]);
		}

		// transition pour le focus de la camera
		if(!this.transitionFocusCamera.isFinished)
		{
			var currentPos = this.transitionFocusCamera.execute3d();
			this.focusCamera[0] = currentPos[0];
			this.focusCamera[1] = currentPos[1];
			this.focusCamera[2] = currentPos[2];
			this.camera.lookAt(new THREE.Vector3(this.focusCamera[0], this.focusCamera[1], this.focusCamera[2]));
		} else {
			this.camera.lookAt(new THREE.Vector3(this.focusCamera[0], this.focusCamera[1], this.focusCamera[2]));
		}
		this.renderer.render(this.scene, this.camera);

	}
	

	
	this.onMouseMove = function(event)
	{
		if(this.mouseDown)
		{
			this.xSouris = event.clientX;

			// var ySouris = event.clientY;
			// this.camera.position.x = map(this.xSouris, 0, window.innerWidth, -1000, 1000);
			// this.camera.position.z = map(ySouris, 0, window.innerHeight, -1000, 1000);

			this.positionCamera();
			this.xSourisOld = this.xSouris;
		}
		return false;
	}



	this.onMouseScroll = function(event) 
	{

	    var event = window.event || event;
	    var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
	    this.scrollSouris += delta;
	    this.scrollSouris = Math.min(this.scrollSouris, 70);
	    this.scrollSouris = Math.max(this.scrollSouris, 40);
		
		this.positionCamera();
	    return false;
	
	}


	this.onMouseDown = function(event)
	{
		this.mouseDown = true;
		this.xSouris = event.clientX;
		this.xSourisOld = this.xSouris;
	}


	this.onMouseUp = function(event)
	{
		this.mouseDown = false;
	}



	this.positionCamera = function()
	{

		// ANGLE CAMERA
		//this.angleCamera = map(this.xSouris, 0, largeurFenetre, 0, 180);
		this.angleCamera += (this.xSouris - this.xSourisOld) * 0.1;

		var x = (Math.cos(this.angleCamera*(Math.PI/180)) * this.rayonCamera) + this.focusCamera[0];
		var y = (Math.sin(this.angleCamera*(Math.PI/180)) * this.rayonCamera) + this.focusCamera[1];
		
		this.camera.position.x = x;
		this.camera.position.y = y;
		this.camera.lookAt( new THREE.Vector3(this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ) );

		// lumiere opposée par rapport a la camera
		/*
		x = (Math.cos((angle+180)*(Math.PI/180)) * rayon) + centre[0];
		y = (Math.sin((angle+180)*(Math.PI/180)) * rayon) + centre[1];
		this.spot2.position.x = x;
		this.spot2.position.y = y;
		this.repereCube.position.x = x;
		this.repereCube.position.y = y;
		this.repereCube.position.z = 0;
		*/
	}





	this.moveCamToPays = function(paysId)
	{
		this.angleCamera = 90;
		this.rayonCamera = projection([ 0, -10 ])[1];

		this.transitionCamera.setup(
			[this.camera.position.x, this.camera.position.y, this.camera.position.z], 
			[ infosPays[paysId][3][0], infosPays[paysId][3][1]+this.rayonCamera, -200 ] );
		
		this.transitionFocusCamera.setup(
			[ this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ],
			[ infosPays[ paysId][3][0], infosPays[paysId][3][1], -10 ] );

		this.isZoom = true;
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


	this.init = function()
	{
		if(this.isZoom)
		{
			this.angleCamera = 90;
			this.rayonCamera = this.positionInitCam[1];

			this.transitionCamera.setup(
				[ this.camera.position.x, this.camera.position.y, this.camera.position.z ], 
				[ this.centreCarte[0], this.centreCarte[1]+this.rayonCamera, -200 ] );
			
			this.transitionFocusCamera.setup(
				[ this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ],
				[ this.centreCarte[0], this.centreCarte[1], -10 ] );

			this.isZoom = false;
		}
	}


}




















//////////////////////////////////////
///////////// INTERACTION ///////////
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
			.style("top", (infosPays[i][2][currentYear]*20-20)+"px")
			.text("#"+infosPays[i][2][currentYear]+" "+infosPays[i][4]);
	}

	dessin.changementAnnee();

}




function clickPays(isoPays)
{

	var id;
	var classement = d3.select("#classement");
	classement.style("color", "black");
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



function init()
{
	if(canvas.isZoom)
	{
		dessin.deleteLine();
		canvas.init();
	}
}





