// Taille du jeu et de la piste
var pisteSize = [1240, 815];

var KartingGame = function() {

    

    var windowSize = getBrowserDimensions();
    if (windowSize.height > 900) {
        windowSize.height = 900;
    }

    // Création du jeu avec les différentes fonctions necessaires.
    var game = new Phaser.Game(windowSize.width / 2, windowSize.height, Phaser.AUTO, 'kartingGameCanvas', {
        preload: preload,
        create: create,
        update: update,
        render: render
    }, true);
    setGameSize(game);
    var karting, piste, menuLabel, currentSpeed = 0;

    // Préchargement des images
    function preload() {
        game.load.image('piste', '/toad/images/game/piste3.png');
        game.load.image('kart', '/toad/images/game/karting_vert.png');
        game.load.image('chrono', '/toad/images/game/icon_chrono.png');
    }

    function create() {
        game.world.setBounds(0, 0, pisteSize[0], pisteSize[1]);

        // Moteur physique du jeu (permet notamment de gérer les collisions)
        game.physics.startSystem(Phaser.Physics.ARCADE);

        piste = game.add.tileSprite(0, 0, pisteSize[0], pisteSize[1], 'piste');
        piste.fixedToCamera = true;
        var checkCollisionObj = new CheckCollisionPiste();

        karting = Karting(game, checkCollisionObj);


        game.camera.follow(karting.sprite);
        //game.camera.deadzone = new Phaser.Rectangle(350, 250, 150, 100);
        game.camera.focusOnXY(0, 0);

        activateWindowSizeCheck(game);

        // Image
        var chronoLogo = game.add.sprite(32, 15, 'chrono');
        chronoLogo.fixedToCamera = true;
    }

    /**
     * Fonction appelée avant chaque frame
     */
    function update() {


        karting.update();

        // La caméra suit le karting, mais la piste reste fixe, 
        // on doit donc la bouger en fonction de la caméra
        piste.tilePosition.x = -game.camera.x;
        piste.tilePosition.y = -game.camera.y;
    }

    function render() {
        // Affichage du temps en cours
        var timeShown = "0:00";
        if (karting.dateDebut) {
            var time = dateDiff(karting.dateDebut, new Date());
            timeShown = time.min + ":" + time.sec;
        }

        game.debug.text(timeShown, 50, 30);

        if (karting.tempsTour) {
            game.debug.text('Dernier temps: ' + karting.tempsTour.min + ":" + karting.tempsTour.sec, 32, 50);
        }

        /*if (karting.checkpointIndex != undefined) {
            game.debug.text('Checkpoint : ' + karting.checkpointIndex, 32, 50);
        }*/

        //game.debug.text('Vitesse : ' + karting.speed, 32, 92);
    }

};

var CheckCollisionPiste = function() {
    var that = this;
    // Doit contenir toutes les infos de transparence de l'image
    // transparancyData[x][y]
    this.transparancyData = [];
    var pisteTransparentSrc = '/toad/images/game/piste2_transparent.png';
    var width = pisteSize[0],
        height = pisteSize[1];
    var start = false;
    var context = null;
    var c = document.createElement("canvas");
    if (c.getContext) {
        context = c.getContext("2d");
        if (context.getImageData) {
            start = true;
        }
    }
    if (start) {
        var alphaData = [];
        var loadImage = new Image();
        loadImage.style.position = "absolute";
        loadImage.style.left = "-10000px";
        document.body.appendChild(loadImage);
        loadImage.onload = function() {
            c.width = width;
            c.height = height;
            c.style.width = width + "px";
            c.style.height = height + "px";
            context.drawImage(this, 0, 0, width, height);
            try {
                try {
                    var imgDat = context.getImageData(0, 0, width, height);
                } catch (e) {
                    netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
                    var imgDat = context.getImageData(0, 0, width, height);
                }
            } catch (e) {
                throw new Error("unable to access image data: " + e);
            }
            var imgData = imgDat.data;
            for (var i = 0, n = imgData.length; i < n; i += 4) {
                var row = Math.floor((i / 4) / width);
                var col = (i / 4) - (row * width);
                if (!alphaData[row]) alphaData[row] = [];
                alphaData[row][col] = imgData[i + 3] == 0 ? 0 : 1;
            }
            that.transparancyData = alphaData;
            loadImage.remove();
            /*
            console.log(alphaData);
            var str = "";
            for(var x = 0 ; x < 1240 ; x++) {
                for(var y = 0 ; y < 877 ; y++) {
                    str += alphaData[x][y];
                }
                str+="\n";
            }
            console.log(str);*/
        };
        loadImage.src = pisteTransparentSrc;
    }
    return this;
}


/**
 * Gestion du changement de traille de la fenêtre
 */
function activateWindowSizeCheck(game) {
    function callback() {
        setGameSize(game);
    }

    $(window).resize(callback);
}

function setGameSize(game) {
    var windowSize = getBrowserDimensions();
    if (windowSize.height > 900) {
        windowSize.height = 900;
    }
    game.scale.setGameSize(windowSize.width / 2, (windowSize.height - ($("#headerBar").height() + $("#headerGrayBarKarting").height())));
}
