//import dependencies
const express = require('express');
const path = require('path');
//set up express validator
const {check, validationResult} = require('express-validator');
const fileUpload = require('express-fileupload');

//set up database
const mongoose = require('mongoose');
mongoose.connect('mongodb://(Add your host here)/schoolblog', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const session = require('express-session');

const Admin = mongoose.model('Admin', {
    username: String,
    password: String
});

const Page = mongoose.model('Page', {
    pageTitle: String,
    pageDescription: String,
    heroImageName: String
});

var myApp = express();
//set up variables to use packages
myApp.use(express.urlencoded({extended: false}));

//set up session
myApp.use(session({
    secret: '8274x181k',
    resave: false,
    saveUninitialized: true
}));

myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');

//set up to use fileUpload
myApp.use(fileUpload());

//render the home page
myApp.get('/', function(req, res){
    Page.find({}).exec(function(err, pages){
        res.render('home', {pages: pages});
    });
});

myApp.get('/login', function(req,res){
    Page.find({}).exec(function(err, pages){
        res.render('login', {pages: pages});
    });
});

//login form post
myApp.post('/login', function(req, res){
    var user = req.body.username;
    var pass = req.body.password;

    Admin.findOne({username: user, password: pass}).exec(function(err, admin){
        //log any errors
        console.log('Error: ' + err);
        console.log('Admin: ' + admin);

        if(admin){
            req.session.username = admin.username;
            req.session.userLoggedIn = true;

            res.redirect('/admin');
        }
        else{
            res.render('login');
        }
    });
});

//admin page
myApp.get('/admin', function(req, res){
    if(req.session.userLoggedIn){
        res.render('admin');
    }
    else{
        res.redirect('/login');
    }
});

//addPage page
myApp.get('/addPage', function(req, res){
    if(req.session.userLoggedIn){
        res.render('addPage');
    }
    else{
        res.redirect('login');
    }
});

//manage page
myApp.get('/manage', function(req, res){
    if(req.session.userLoggedIn){
        Page.find({}).exec(function(err, pages){
            res.render('manage', {pages: pages});
        });
    }
    else{
        res.redirect('login');
    }
});

myApp.post('/process', [
    check('pageTitle', '*Please enter a page title*').not().isEmpty(),
    check('pageDescription', '*Please enter a page description*').not().isEmpty()
], function(req, res){
    Page.find({}).exec(function(err, pages){
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        res.render('addPage', {
            errors: errors.array()
        })
    }
    else{
        //fetch all form fields
        var pageTitle = req.body.pageTitle;
        var pageDescription = req.body.pageDescription;

        //get the name of the image file
        var heroImageName = req.files.heroImage.name;
        //get the actual file(temp file)
        var heroImageFile = req.files.heroImage;
        //save it
        var heroImagePath = 'public/uploads/' + heroImageName;
        //move to correct folder(the public folder)
        heroImageFile.mv(heroImagePath, function(err){
            console.log(err);
        });

        var pageData = {
            pageTitle: pageTitle,
            pageDescription: pageDescription,
            heroImageName: heroImageName
        }

        var myPage = new Page(pageData);

        myPage.save().then(function(){
            console.log('New Page has been created!')
        });

        res.render('addPageSuccess', {pages: pages});
    }
  });
});

//deleting a page
myApp.get('/deleteSuccess/:pageid', function(req, res){
    if(req.session.userLoggedIn){
        var pageid = req.params.pageid;
        console.log(pageid);
        Page.findByIdAndDelete({_id: pageid}).exec(function(err, page){
            console.log('Error ' + err);
            console.log('Page ' + page);
            if(page){
                res.render('deleteSuccess', {message: 'Successfully deleted the page!'});
            }
            else{
                res.render('deleteSuccess', {message: 'Sorry could not delete page!'});
            }
        })
    }else{
        res.redirect('/login')
    }
})


//logout page
myApp.get('/logout', function(req, res){
    //need to remove variables from session, then we send them back to logout screen
    Page.find({}).exec(function(err, pages){
        req.session.username = '';
        req.session.userLoggedIn = false;
        res.render('logout', {pages: pages});
    });
});

myApp.get('/:pageid', function(req, res){
    Page.find({}).exec(function(err, pages){
        var pageId = req.params.pageid;
        console.log(pageId);

        Page.findOne({_id: pageId}).exec(function(err, page){
            if(page){
                res.render('page', {
                    pageTitle: page.pageTitle,
                    pageDescription: page.pageDescription,
                    heroImageName: page.heroImageName,
                    pages: pages
                });
            }
            else{
                res.send('404: Sorry we have sadly ran into an error!')
            }
        });
    });
});


//edit the page down here
myApp.get('/editPage/:pageid', function(req, res){
    if(req.session.userLoggedIn){
        var pageid = req.params.pageid;
        console.log(pageid);
        Page.findOne({_id: pageid}).exec(function(err, page){
            if(page){
                res.render('editPage', {page: page});
            }
            else{
                res.send('No page found with that id...')
            }
        })
    }
    else{
        res.redirect('/login');
    }
})

myApp.post('/editPage/:id', [
    check('pageTitle', '*Please enter a page title*').not().isEmpty(),
    check('pageDescription', '*Please enter a page description*').not().isEmpty()
], function(req, res){
    
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        var pageid = req.params.id;
        Page.findOne({_id: pageid}).exec(function(err, page){
            if(page){
                res.render('editPage', {page: page, errors:errors.array()});
            }
            else{
                res.send('Nor page found')
            }
        })
    }
    else{
        //fetch all form fields
        var pageTitle = req.body.pageTitle;
        var pageDescription = req.body.pageDescription;

        //get the name of the image file
        var heroImageName = req.files.heroImage.name;
        //get the actual file(temp file)
        var heroImageFile = req.files.heroImage;
        //save it
        var heroImagePath = 'public/uploads/' + heroImageName;
        //move to correct folder(the public folder)
        heroImageFile.mv(heroImagePath, function(err){
            console.log(err);
        });

        var pageData = {
            pageTitle: pageTitle,
            pageDescription: pageDescription,
            heroImageName: heroImageName
        }

        var id = req.params.id;

        Page.findOne({_id:id}, function(err, page){
            page.pageTitle = pageTitle;
            page.pageDescription = pageDescription;
            page.heroImageName = heroImageName;
            page.save();
        });

        res.render('editSuccess');
    }

});

myApp.listen(8080);
console.log('Everything executed fine...website at port 8080...');
