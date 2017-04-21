var http		= require('http'),
	mysql		= require('mysql'),
	connection	= mysql.createConnection({host:'localhost', user: 'root', password : 'root' }),
	express		= require('express'),
	session		= require('express-session'),
	bodyParser	= require('body-parser'),
	app			= express(),
	http		= require('http'),
	sio			= require('socket.io')(server),
	utf8		= require('utf8'),
	fs			= require('fs');

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(session({
	secret: 'jmisiti',
	resave: false,
	saveUninitialized: true,
	cookie: { maxAge: 6000, secure: true }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

var server = app.listen(8080),
	io = require('socket.io').listen(server);
connection.connect();
connection.query('CREATE DATABASE IF NOT EXISTS JM_MATCHA', function (error, results, fields) {
	if (error)
		throw error;
	else
		console.log("Base de données crée.");
});
connection.query('USE JM_MATCHA', function (error, results, fields) {
	if (error)
		throw error;
});
connection.query('CREATE TABLE IF NOT EXISTS users(id INT AUTO_INCREMENT PRIMARY KEY NOT NULL, mail VARCHAR(100) NOT NULL, name VARCHAR(100), firstname VARCHAR(100), passwd VARCHAR(100) NOT NULL)', function (error, results, fields) {
	if (error)
		throw error;
	else
		console.log("Table users crée.");
});
var sess,
	passedVariable;

app.get('/', function(req, res) {
	res.charset = 'utf-8';
	sess = sess ? sess : req.session;
	passedVariable = req.query ? req.query : null;
	res.render('index', { mail: sess.mail ? sess.mail : "", type: passedVariable.type ? passedVariable.type : "", msg: passedVariable.msg ? passedVariable.msg : "" });
});

app.get('/login', function(req, res) {
	res.charset = 'utf-8';
	sess = sess ? sess : req.session;
	if (sess.mail)
		res.render('index', { mail: connection.escape(sess.mail), msg: "Vous êtes déjà connecté.", type: "error" });
	else
		res.render('login', { mail: "", type: "" });
});

app.post('/login', function(req, res) {
	sess = sess ? sess : req.session;
    sess.mail = connection.escape(req.body.mail);
    res.charset = 'utf-8';
	res.redirect('/?type=ok&msg=' + utf8.encode("Vous êtes maintenant connecté."));
});

app.get('/signin', function(req, res) {
	res.charset = 'utf-8';
	sess = sess ? sess : req.session;
	if (sess.mail)
		res.render('index', { mail: connection.escape(sess.mail), msg: "Vous êtes déjà connecté.", type: "error" });
	else
		res.render('signin', { mail: "", type: "" });
});

app.post('/signin', function(req, res) {
	sess = sess ? sess : req.session;
    res.charset = 'utf-8';
    connection.query('SELECT COUNT(*) AS count FROM users WHERE mail = "' + connection.escape(req.body.mail) + '";', function (error, results, fields) {
    	if (results[0].count == 0)
    	{
			sess.mail = connection.escape(req.body.mail);
			sess.passwd = connection.escape(req.body.passwd);
			connection.query('INSERT INTO users (mail, passwd) VALUES ("'+ sess.mail + '", "' + sess.passwd + '");', function (error, results, fields) {
				if (error)
					res.redirect('/?type=error&msg=' + utf8.encode(error.code));
				else
					res.redirect('/?type=ok&msg=' + utf8.encode("Votre compte a bien été crée."));
			});
    	}
    	else
    		res.redirect('/?type=error&msg=' + utf8.encode("Un compte utilise déjà cette e-mail."));
    });
});

io.sockets.on('connection', function (socket) {
    // Quand un client se connecte, on lui envoie un message
    socket.emit('message', 'Vous êtes bien connecté !');
    // On signale aux autres clients qu'il y a un nouveau venu
    socket.broadcast.emit('message', 'Un autre client vient de se connecter ! ');

    // Dès qu'on nous donne des coordonnées, on le stockes dans la session et en BDD
    socket.on('datas:send', function(datas) {
		socket.lat = datas.lat;
		socket.lng = datas.lng;
		console.log(datas.lat);
    });

    // Dès qu'on reçoit un "message" (clic sur le bouton), on le note dans la console
    socket.on('message', function (message) {
        // On récupère le pseudo de celui qui a cliqué dans les variables de session
        console.log(socket.pseudo + ' me parle ! Il me dit : ' + message);
    }); 
});
