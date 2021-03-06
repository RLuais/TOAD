
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , fs = require('fs')
  , http = require('http')
  , request = require('request')
  , compress = require('compression')
  , jsdom = require('jsdom')
  , path = require('path')
  , bodyParser = require('body-parser')
  , favicon = require('serve-favicon')
  , logger = require('morgan')
  , papaParse = require('papaparse')
  , methodOverride = require('method-override');

//On intègre le ftp au lancement de l'application
//require('./ftp');

var app = express();

var oneDay = 86400000;

//Methode pour recuperer un fichier JS depuis son URL complete et
// modifie les eventuels champs url: pour pointer sur la bonne url
var getJs = function(script){
  var fileName = script.replace("javascript/", "");
  request.get("https://www.apex-timing.com/gokarts/"+script, function(error, response, body){
    if(~fileName.indexOf("?")){
      fileName = fileName.substr(0, fileName.indexOf("?"));
    }
    fileName = "public/scripts/apex/"+ fileName;
    body = body.replace("url: \"", "url: \"https://www.apex-timing.com/gokarts/");
    fs.writeFile(fileName, body, function(err){
      if(err){
        console.log(err);
      }
    });
  })
};



app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/public/images/favicon.png'));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(compress());
app.use(require('stylus').middleware(__dirname + '/public'));
app.use('/toad', express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));

if (app.get('env') == 'development') {
	app.locals.pretty = true;
}

app.get('/toad', routes.index);

app.get('/resultatsApex', function(req, res){
  var urlSaisie = req.query;
  var params = "";
  for(var param in urlSaisie){
    console.log(param, urlSaisie[param]);
    params += "&"+param+"="+urlSaisie[param];
  };
  // /!\ Penser a changer le challenge pour correspondre aux resultats de la CUP
  // Pour l'instant le leaderboard7 sert uniquement a afficher des resultats
  // Et montrer que la pagination / filtre fonctionne
  request.get("https://www.apex-timing.com/gokarts/results.php?center=54&leaderboard=7"+params, function(error, response, body){
    jsdom.env(
      body,
      function(err, window){
        global.window = window;
        global.document = window.document;
        var scripts = document.querySelectorAll('script');
        for(var i = 0; i < scripts.length; i++){
          var script = scripts[i].src;
          if(script !== ""){
            var url = "https://www.apex-timing.com/gokarts/" + script;
            //Appel fonction pour recuperer script js unitairement
            getJs(script);
          }
        }
      }
    );
    // Modification des src javascript pour pointer sur les sources locales
    var regExpJs = new RegExp("src=\"javascript", "g");
    body = body.replace(regExpJs, "src=\"toad/scripts/apex");
    // Modification des src media/images/href
    var regExpMedia = new RegExp("src=\"media", "g");
    body = body.replace(regExpMedia, "src=\"https://www.apex-timing.com/gokarts/media");
    var regExpImages = new RegExp("src=\"images", "g");
    body = body.replace(regExpImages, "src=\"https://www.apex-timing.com/gokarts/images");
    var regExpHref = new RegExp("link href=\"", "g");
    body = body.replace(regExpHref, "link href=\"https://www.apex-timing.com/gokarts/");
    //On remplace l'appel a la fonction Top_Result par notre fonction pour gerer les filtres eventuels du tableau
    var regExpTopResult = new RegExp("Top_Results()", "g");
    body = body.replace(regExpTopResult, "filtre");
    var regExpSearchResult = new RegExp("Search_Results()", "g");
    body = body.replace(regExpSearchResult, "filtre");
    //On gere ici le lien vers la fiche du membre selectionne
    var regExpMember = new RegExp("location.href='member.php\?", "g");
    body = body.replace(regExpMember, "location.href=\'https://www.apex-timing.com/gokarts/member.php");
    //On injecte notre script js pour gerer la pagination et les filtres
    body = body.replace('</body>', '<script type="text/javascript" src="toad/scripts/inputApex.js" ></script></body>');

    res.end(body);
  })
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
