
 window.addEventListener("load", setup, false);
    

var width = window.innerWidth;
var height = window.innerHeight;
var langue = "FR";

var projection = d3.geo.mercator().scale(80);
var path = d3.geo.path().projection(projection);

var canvas;
var dessin;




function setup()
{   

    queue()
        .defer(lireJson, "bin/world-countries-clean.json")
        .awaitAll(init);

}



function init(error, results)
{

    canvas = new Canvas();
    canvas.setup(width, height);

    dessin = new Dessin();
    dessin.setup(canvas.scene, results[0]);

    animate();

}




function animate()
{

    requestAnimationFrame(animate); 
    canvas.draw();
    
}










/////////////////////////////////////////////
//////////// UTILS /////////////////////////
////////////////////////////////////////////

function lireCsv(url, callback) {
    d3.csv(url, function(d){ callback(null, d); });
}
function lireJson(url, callback) {
    d3.json(url, function(d){ callback(null, d); });
}

function getPath(path)
{

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
//////////// DESSIN /////////////////////////
////////////////////////////////////////////

var Dessin = function()
{
    
    
    this.setup = function(scene, data)
    {

        this.displayBorders(scene, data);
        this.displayRelief(scene);

    }




    this.displayRelief = function(scene)
    {
        var n = 0;
        function loaded() {
            n++;
            console.log("loaded: " + n);

            if (n == 3) {
                terrain.visible = true;
            }
        }


        var profondeur = -40;
        var taille = projection([ 179, -84 ]);
        /*
        console.log(taille[0]+" / "+taille[1]);
        var geo = new THREE.PlaneGeometry(taille[0], taille[1]);
        var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x666666, side: THREE.DoubleSide }));
        mesh.position.set(0, 0, 0);
        scene.add(mesh);
        //*/

        // heightmap
        var texture = THREE.ImageUtils.loadTexture('bin/mapInverse.png', null, loaded);

        // texture effect
        var detailTexture = THREE.ImageUtils.loadTexture("bin/textureLisse.jpg", null, loaded);

        var terrainShader = THREE.ShaderTerrain[ "terrain" ];
        var uniformsTerrain = THREE.UniformsUtils.clone(terrainShader.uniforms);


        // HAUTEUR MAX
        uniformsTerrain[ "tDisplacement" ].value = texture;
        uniformsTerrain[ "uDisplacementScale" ].value = profondeur;

        // EFFET TEXTURE
        uniformsTerrain[ "tNormal" ].value = detailTexture;
        uniformsTerrain[ "tDiffuse1" ].value = detailTexture;
        uniformsTerrain[ "tDetail" ].value = detailTexture;

        // COULEUR
        uniformsTerrain[ "uNormalScale" ].value = 1;
        uniformsTerrain[ "enableDiffuse1" ].value = true;
        uniformsTerrain[ "enableDiffuse2" ].value = true;
        uniformsTerrain[ "enableSpecular" ].value = true;
        uniformsTerrain[ "uDiffuseColor" ].value.setHex(0xcccccc);  // diffuse
        uniformsTerrain[ "uSpecularColor" ].value.setHex(0x000000); // spec 
        uniformsTerrain[ "uAmbientColor" ].value.setHex(0x0000cc);  // ambiant

        uniformsTerrain[ "uShininess" ].value = 3;  // shiness
        uniformsTerrain[ "uRepeatOverlay" ].value.set(6, 6); // light reflection

        // MATERIAL
        var material = new THREE.ShaderMaterial({
            uniforms: uniformsTerrain,
            vertexShader: terrainShader.vertexShader,
            fragmentShader: terrainShader.fragmentShader,
            lights: true,
            fog: false,
            side: THREE.DoubleSide
        });

        var geometryTerrain = new THREE.PlaneGeometry(taille[0], taille[1], 256, 256);
        geometryTerrain.computeFaceNormals();
        geometryTerrain.computeVertexNormals();
        geometryTerrain.computeTangents();

        var terrain = new THREE.Mesh(geometryTerrain, material);
        terrain.position.set(taille[0]/2, taille[1]/2, -profondeur);

        scene.add(terrain);

        loaded();

    }




    this.displayBorders = function(scene, data)
    {

        var materialBorder = new THREE.LineBasicMaterial({ 
            color:0x0000ff,
            transparent: true, 
            opacity: 1,
            linewidth: 1
        });


        for(var k = 0; k < data.features.length; k++)
        {

            var coor = getPath(path(data.features[k]));

            for(var i = 0; i < coor.length; i++)
            {
                var geometryBorder = new THREE.Geometry();

                for(var j = 0; j < coor[i].length; j+=2)
                {
                    geometryBorder.vertices.push(new THREE.Vector3(coor[i][j], coor[i][j+1], 0));
                }
                
                // dernier point pour fermer la forme
                geometryBorder.vertices.push(new THREE.Vector3(coor[i][0], coor[i][1], 0));

                // ajout dans la scene
                var line = new THREE.Line(geometryBorder, materialBorder);
                line.position.set(0, 0, 0);       
                scene.add(line);

            }
        
        }
    }



    this.draw = function()
    {   

  

    }

    
    
    
}























/////////////////////////////////////////////
//////////// CANVAS ////////////////////////
////////////////////////////////////////////

var Canvas = function()
{

    this.canvas;
    this.renderer;
    this.scene;
    this.centreCarte;

    this.xSouris, this.xSourisOld;
    this.ySouris, this.ySourisOld;
    this.mouseDown;
    this.scrollSouris; 
    
    this.spot1; this.spot2;
    this.angleSpot;

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
        this.ySouris = 0; this.ySourisOld = 0;


        // SCENE
        this.scene = new THREE.Scene();
        //this.scene.fog = new THREE.Fog( 0x000000, 1, FAR/8 );

        // CAMERA
        this.isZoom = false;
        this.angleCamera = 90;
        this.positionInitCam = projection([ 0, -84 ]);
        this.transitionCamera = new Transition();
        this.transitionFocusCamera = new Transition();
        this.focusCamera = [ this.centreCarte[0], this.centreCarte[1], 100 ];
        this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
        this.camera.up = new THREE.Vector3( 0, 0, -1 );

        this.rayonCamera = this.positionInitCam[1];
        var centre = this.focusCamera;
        var x = (Math.cos(this.angleCamera*(Math.PI/180)) * this.rayonCamera) + centre[0];
        var y = (Math.sin(this.angleCamera*(Math.PI/180)) * this.rayonCamera) + centre[1];
        this.rayonCamera = this.positionInitCam[1];
        this.camera.position.set( x, y, -400 );
        this.camera.lookAt(new THREE.Vector3( this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ));
        this.scene.add(this.camera);

    
        // RENDERER
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(WIDTH, HEIGHT);
        this.renderer.setClearColor("#000000", 1);


        // LIGHT
        this.scene.add( new THREE.AmbientLight( 0x888888 ) );

        this.spot1 = new THREE.DirectionalLight( 0x1111cc, 1 );
        this.spot1.position.set( 200, 0, 200 );
        this.spot1.intensity = 1.0;
        this.scene.add(this.spot1);

        this.spot2 = new THREE.DirectionalLight( 0xffffff, 0.4 );
        this.spot2.position.set( 200, 0, 200 );
        this.spot2.intensity = 1.0;
        this.scene.add(this.spot2);


        this.canvas = this.renderer.domElement;
        document.getElementById("carte").appendChild(this.canvas);
        


        var clone = this;
        this.canvas.addEventListener("mousemove", function(event){ clone.onMouseMove(event); }, false);
        this.canvas.addEventListener("mousedown", function(event){ clone.onMouseDown(event); }, false);
        this.canvas.addEventListener("mouseup", function(event){ clone.onMouseUp(event); }, false);
        this.canvas.addEventListener("mouseout", function(event){ clone.onMouseUp(event); }, false); // releve le clic si tu sort du canvas
        //this.canvas.addEventListener("mousewheel", function(event){ clone.onMouseScroll(event); }, false);
        //this.canvas.addEventListener("DOMMouseScroll", function(event){ clone.onMouseScroll(event); }, false);

    }
    
    

    this.draw = function()
    {
     
        // transition pour la position de la camera
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

        // rendu
        this.renderer.render(this.scene, this.camera);

    }
    

    
    this.onMouseMove = function(event)
    {
        
        if(this.mouseDown)
        {
            this.xSouris = event.clientX;
            this.ySouris = event.clientY;

            this.positionCamera();

            this.xSourisOld = this.xSouris;
            this.ySourisOld = this.ySouris;
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
        this.ySouris = event.clientY;
        this.ySourisOld = this.ySouris;
    }



    this.onMouseUp = function(event)
    {
        this.mouseDown = false;
    }




    this.positionCamera = function()
    {

        // ROTATION HORIZONTALE
        //this.angleCamera = map(this.xSouris, 0, largeurFenetre, 0, 180);
        this.angleCamera += (this.xSouris - this.xSourisOld) * 0.1;

        var x = (Math.cos(this.angleCamera*(Math.PI/180)) * this.rayonCamera) + this.focusCamera[0];
        var y = (Math.sin(this.angleCamera*(Math.PI/180)) * this.rayonCamera) + this.focusCamera[1];
        
        this.camera.position.x = x;
        this.camera.position.y = y;
        this.camera.lookAt( new THREE.Vector3(this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ) );

        // ROTATION VERTICALE
        var dragY = (this.ySouris - this.ySourisOld);
        if((this.rayonCamera > 60 && dragY < 0) || (this.rayonCamera < 500 && dragY > 0) )
        {
            this.rayonCamera += dragY;
        }
    }



    this.moveCamToPays = function(paysId)
    {

        this.angleCamera = 90;
        this.rayonCamera = projection([ 0, -10 ])[1];

        this.transitionCamera.setup(
            [this.camera.position.x, this.camera.position.y, this.camera.position.z], 
            [ infosPays[paysId][3][0], infosPays[paysId][3][1]+this.rayonCamera, 2000 ] );
        
        this.transitionFocusCamera.setup(
            [ this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ],
            [ infosPays[ paysId][3][0], infosPays[paysId][3][1], 100 ] );

        this.isZoom = true;

    }

    

    this.positionSpot = function()
    {

        this.angleSpot++;
        var rayon = 1000;
        var centre = this.centreCarte;

        var x = (Math.cos(this.angleSpot*(Math.PI/180)) * rayon)+centre[0];
        var y = (Math.sin(this.angleSpot*(Math.PI/180)) * rayon)+centre[1];

        this.spot2.position.x = x;
        this.spot2.position.y = y;
        this.repereCube.position.x = x;
        this.repereCube.position.y = y;

    }



    this.init = function()
    {

        if(this.isZoom)
        {
            this.angleCamera = 90;
            this.rayonCamera = this.positionInitCam[1];

            this.transitionCamera.setup(
                [ this.camera.position.x, this.camera.position.y, this.camera.position.z ], 
                [ this.centreCarte[0], this.centreCarte[1]+this.rayonCamera, 2000 ] );
            
            this.transitionFocusCamera.setup(
                [ this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ],
                [ this.centreCarte[0], this.centreCarte[1], 100 ] );

            this.isZoom = false;
        }

    }


    this.onResize = function(newWidth, newHeight)
    {
        this.renderer.setSize(newWidth, newHeight);
    }


}








//////////////////////////////////////
///////////// INTERACTION ///////////
////////////////////////////////////


window.addEventListener("resize", onresize, false);

function onresize()
{

    var newWidth = window.innerWidth;
    var newHeight = window.innerHeight;
    canvas.onResize(newWidth, newHeight);

}














