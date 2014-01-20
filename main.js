
window.addEventListener("load", setup, false);




var width = window.innerWidth;
var height = window.innerHeight;





var canvas;
var dessin;
var projection = d3.geo
	//.azimuthalEqualArea();
	.mercator();
	//.conicEquidistant();
	//.orthographic();
projection.scale(80);
var path = d3.geo.path().projection(projection);
var pointsStructure;
var infosPays;
var currentYear;
var hauteurMax;

	
var largeurFenetre = window.innerWidth;
var path = d3.geo.path().projection(projection);






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
	dessin.setup(canvas.getScene());
	dessin.draw(canvas.getScene(), results[0], results[1]);
	
	animate();


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


	this.mesh;
	this.transition;
	this.lines;
	this.line;
	this.transitionLine;




	this.setup = function(scene)
	{
		this.centroid = [];

		var HG = projection([-180,84]);
		var HD = projection([180,84]);
		var BD = projection([180,-66]);
		var BG = projection([-180,-66]);
		var MG = projection([-180,0]);
		var MD = projection([180,0]);

		// var extraPoints = []

		// extraPoints.push(projection([-180,-28]));
		// extraPoints.push(projection([-139,-28]));
		// extraPoints.push(projection([-110,-5]));
		// extraPoints.push(projection([-90,0]));
		// extraPoints.push(projection([-79,10]));
		// extraPoints.push(projection([-80,29]));
		// extraPoints.push(projection([-69,37]));
		// extraPoints.push(projection([-29,4]));
		// extraPoints.push(projection([-70,-15]));
		// extraPoints.push(projection([-50,-29]));
		// extraPoints.push(projection([-80,-69]));
		// extraPoints.push(projection([18,-70]));
		// extraPoints.push(projection([-10,-38]));
		// extraPoints.push(projection([-20,-16]));
		// extraPoints.push(projection([-20,-1]));
		// extraPoints.push(projection([4,0]));
		// extraPoints.push(projection([9,5]));
		// extraPoints.push(projection([19,22]));
		// extraPoints.push(projection([30,22]));
		// extraPoints.push(projection([50,15]));
		// extraPoints.push(projection([59,-5]));
		// extraPoints.push(projection([78,10]));
		// extraPoints.push(projection([89,-1]));
		// extraPoints.push(projection([109,22]));
		// extraPoints.push(projection([149,29]));
		// extraPoints.push(projection([179,28]));
		// extraPoints.push(projection([179,4]));
		// extraPoints.push(projection([131,-11]));
		// extraPoints.push(projection([179,-37]));

		// for (var i=0; i< extraPoints.length ; i++){
		// 	this.centroid.push( [ extraPoints[i][0] , extraPoints[i][1] , 0 ]);		
		// }

		// TEXTURE
		var texture = THREE.ImageUtils.loadTexture("imageCarte.png");
		// texture.wrapS = THREE.RepeatWrapping; 
		// texture.wrapT = THREE.RepeatWrapping;



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


		//MATERIAL
		this.materialMesh = new THREE.MeshLambertMaterial({ 
	    	map: texture,
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

				var centro = [centroidTemporaire[0], centroidTemporaire[1], -(k)*0.2 ];


				
				this.centroid.push( centro );
				//this.centroid[k] = [centroidTemporaire[0], centroidTemporaire[1], k-200 ];


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


		this.uniforms.delta.value += 0.1;

		// delaunay sur les centroid
		/*
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

			this.mesh.geometry.verticesNeedUpdate = true;	
      	}


      	if(!this.transitionLine.isFinished)
		{
			var currentPosition = this.transitionLine.execute();
			this.line.geometry.vertices[0].z = currentPosition;
			this.line.geometry.verticesNeedUpdate = true;
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
			
		}*/


	}

		var delaunay = d3.geom.delaunay(this.centroid);

	    var geometrie = new THREE.Geometry();

	    for (var i=0; i < delaunay.length; i++ ){
	    	geometrie.vertices.push(new THREE.Vector3(delaunay[i][0][0], delaunay[i][0][1], delaunay[i][0][2]));
			geometrie.vertices.push(new THREE.Vector3(delaunay[i][1][0], delaunay[i][1][1], delaunay[i][1][2]));
			geometrie.vertices.push(new THREE.Vector3(delaunay[i][2][0], delaunay[i][2][1], delaunay[i][2][2]));
			geometrie.faces.push( new THREE.Face3( 3*i,1+3*i,2+3*i ));

		    geometrie.faceVertexUvs[0].push([
		        new THREE.Vector2( map(delaunay[i][0][0],1,1000,0,1), map(delaunay[i][0][1],1,1000,1,0) ),
		        new THREE.Vector2( map(delaunay[i][1][0],1,1000,0,1), map(delaunay[i][1][1],1,1000,1,0) ),
		        new THREE.Vector2( map(delaunay[i][2][0],1,1000,0,1), map(delaunay[i][2][1],1,1000,1,0) )
	        ]);


		for(var i = 0; i < infosPays.length; i++)
      	{
			this.transition[i].setup( this.mesh.geometry.vertices[infosPays[i][1]].z, -map(infosPays[i][2][currentYear], 180, 0, 0, hauteurMax ));
			this.transition[i].setTween(1);
			this.transition[i].setSpeed(0.1);
		}

	    }


	    geometrie.computeFaceNormals();

	    var mesh = new THREE.Mesh(geometrie, this.materialMesh);
	    mesh.doubleSided = true;		
	    scene.add(mesh);




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
	this.camera;
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


	this.positionInitCam;
	this.xSouris;
	this.scrollSouris;


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


		this.scrollSouris = 100

		this.centreCarte = projection([0,0]);
		this.positionInitCam = projection([0,-89]);

		//this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
		this.camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 10000 );
		this.camera.position.set(this.positionInitCam[0], this.positionInitCam[1], -1000);
		this.camera.lookAt(new THREE.Vector3(this.centreCarte[0], this.centreCarte[1], -100));
		this.camera.up = new THREE.Vector3(0, 0, -1);

		this.scene = new THREE.Scene();

	
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

		document.body.appendChild(this.renderer.domElement);

		
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


		this.scene.add(this.camera);
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

		var xSouris = event.clientX;
		//this.positionCamera();
		this.camera.position.x = map(xSouris, 0, window.innerWidth, -1000, 1000);
		//this.camera.position.y = map(xSouris, 0, window.innerWidth, -1000, 1000);
		//this.camera.position.z = map(xSouris, 0, window.innerWidth, -1000, 1000);
		this.camera.lookAt(new THREE.Vector3(this.centreCarte[0], this.centreCarte[1], -100));
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
		// x = (Math.cos((angle+180)*(Math.PI/180)) * rayon) + centre[0];
		// y = (Math.sin((angle+180)*(Math.PI/180)) * rayon) + centre[1];
		// this.spot2.position.x = x;
		// this.spot2.position.y = y;
		// this.repereCube.position.x = x;
		// this.repereCube.position.y = y;
		// this.repereCube.position.z = 0;
		
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

	




	this.positionCamera = function()
	{

		var coordonneesCamera = []
		var angleMax = 180;
		var angleOrbiteCamera, rayonOrbiteCamera;
		var rayonMin = 100;
		var rayonMax = projection([180,0]);
			rayonMax = rayonMax[1];

		angleOrbiteCamera =  angleMax * this.xSouris / largeurFenetre;
		//calcul du rayon de l'orbite de la caméra
		rayonOrbiteCamera = this.positionInitCam[1]*this.scrollSouris/100
		coordonneesCamera = [Math.cos(angleOrbiteCamera*(Math.PI/180))*rayonOrbiteCamera, Math.sin(angleOrbiteCamera*(Math.PI/180))*rayonOrbiteCamera] ;
		
		this.camera.position.x = coordonneesCamera[0]+this.positionInitCam[0];
		this.camera.position.y = coordonneesCamera[1];
		this.camera.lookAt(new THREE.Vector3(this.centreCarte[0], this.centreCarte[1], -100));


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



	
	
	
	// GET / SET ///////////////////////////
	this.getScene = function(){ return this.scene; }
	

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







