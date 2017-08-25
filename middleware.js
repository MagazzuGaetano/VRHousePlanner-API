var jwt  = require('jsonwebtoken');

module.exports = function(req,res,next){
    var token = req.headers.authorization || req.body.token || req.query.token || req.headers['x-access-token'];

    if (token) {
     jwt.verify(token,'idc', function(err, decoded) {
       if (err) {
         return res.json({ success: false, message: 'Failed to authenticate token.' });
       } else {
         req.decoded = decoded;
         next();
       }
     });
   }
   else {
     return res.status(403).send({
         success: false,
         message: 'No token provided.'
     });
   }
}
