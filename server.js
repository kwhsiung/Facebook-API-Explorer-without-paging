var express = require('express'),  	//npm install express
	app     = express(),
	graph   = require('fbgraph'), 	//npm install fbgraph
	fs      = require('fs'); 	    //File System

var savejson = function(name, jsondata){
	fs.writeFile(name+".json", JSON.stringify(jsondata));
};

var get_recursive = function(postid, field_query, subfield_query, MAX_DEPTH, callback){
	graph.get(postid+'/'+field_query+'/'+subfield_query, function(err, res) 
	{
      	if(err || !res) 
      	{
    		if(!res) 
    		{
    			console.log("Error %s===null.", field_query);
				console.dir(res);
				callback({"error": {"message": "No sharedpost."}}, res);
			}
			callback(err, res);
			return;
		}
      	var recurpaging = function(res, depth, MAX_DEPTH, callback) 
      	{
        	if(depth >= MAX_DEPTH) 
        	{
          		console.log("[resursive paging: MAX_DEPTH");
          		console.log(field_query+".length: " + data_query.data.length ); 
          		//savejson("data_query", data_query);
          		callback(null, data_query);
          		return;
        	}


        	if(res.data && res.paging && res.paging.next) 
        	{
          		graph.get(res.paging.next, function(err, res) 
          		{
          	  		if(err) {callback(err, res);}
              		// page depth
              		depth++;
              		//console.log(res);
              		console.log("page "+depth+" "+field_query+".length: " + res.data.length);
               
              		//data_query.data = data_query.data.concat(res.data);
              		data_query.data.push.apply(data_query.data, res.data);

              		//console.log("data_query: " + data_query.data );
              		//savejson("data_query", data_query);

              		setTimeout(recurpaging(res, depth, MAX_DEPTH, callback), Math.random()*10);
          		});
        	} 
        	else 
        	{
          		console.log("[resursive paging: end --------------]");
          		console.log(field_query+".length: " + data_query.data.length ); 
          		//savejson("data_query", data_query);
          		callback(null, data_query);
        	}
      }; 

      //console.log(res); 
      //console.log(res.data); 
      //console.log("res.data.length: " + res.data.length );
      var data_query={"data": []};
      data_query.data = res.data;//data_query.data.concat(res.data);
      console.log("page "+1+" "+field_query+".length: " + data_query.data.length ); 
      
      recurpaging(res, 1, MAX_DEPTH, callback);
      return;       
  	});
};

app.get('/api', function(expressRequest, expressResponse)
{
	// CSP headers
	expressResponse.set("Access-Control-Allow-Origin", "*");
	expressResponse.set("Access-Control-Allow-Headers", "X-Requested-With");

	var userid     = expressRequest.query.userid,
		queryfield = expressRequest.query.queryfield,
		detailfield= "?"+expressRequest.query.detailfield+"&limit=250";

		console.log("userid is "+userid);
		console.log("queryfield is "+queryfield);
		console.log("detailfield is "+detailfield);

	// query setting
	var options = 
	{
    	timeout:  10000000, 
    	pool:     { maxSockets:  Infinity }, 
    	headers:  { connection:  "keep-alive" }
    };
	graph.setAccessToken(expressRequest.query.token)
	 	 .setOptions(options);

	graph.get(userid, {fields: ""}, function(fbgraphError, fbgraphResponse) {
		if(fbgraphError && !fbgraphResponse)
		{
			console.log("response === null ");
			console.dir(fbgraphError); 	
			expressResponse.send({"error": {"message": JSON.stringify(fbgraphError)}}); 		  		
		} 
		else 
		{
			console.log("response.id: "+fbgraphResponse.id); 
			userid = fbgraphResponse.id;

			// collect data in async way, then convert to links and nodes
			// query in facebook api explorer,i.e ptttw?fields=posts.fields(id,object_id,type,message,story,from,shares,likes.limit(1).summary(true),comments.limit(1).summary(true))
			get_recursive(userid, queryfield, detailfield, 500, function(get_recursiveError, get_recursiveResponse) 
			{
				// console.log("OUTSIDE: ");
				// console.dir(res); 
				if(get_recursiveError || !get_recursiveResponse) 
		    	{
		    		if(!get_recursiveResponse) 
		    		{
		    			console.log("Err res_posts === null: ");
	    				console.dir(get_recursiveResponse);
	    				//callback({"error": {"message": "No feed."}}, res_posts);
	    			}
	    			console.dir(get_recursiveError);
	    			expressResponse.send({"error": {"message": JSON.stringify(get_recursiveError)}});
		    	} 
		    	else 
		    	{ 	
			    	savejson("posts_"+userid,get_recursiveResponse);
			    	expressResponse.send(get_recursiveResponse);
				}
			});
		}          
	}); //graph.get(userid, {fields: ""}, function(err, res0) {			
});

var port = process.env.PORT || 2000;
app.listen(port, function() {
	console.log("Express server listening on port %d", port);
});

app.use(express.static(__dirname + '/'));