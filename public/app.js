'use strict';

var learnjs = {
	poolId: "us-east-1:93307603-2dc4-479f-9f25-6f984d17a558"
};

learnjs.problems = [
	{
		description: "What is truth?",
		code: "function problem() { return __ ; }"
	},
	{
		description: "Simple Math",
		code: "function problem() { return 42 === 6 * __ ; }"
	}
];

learnjs.dataBind =function(obj, elm) {
	for (var key in obj) {
		elm.find("[data-name=" + key + "]").text(obj[key]);
	}
};

learnjs.flashElement = function(elem, content) {
	elem.fadeOut("fast", function() {
		elem.html(content);
		elem.fadeIn();
	});
};

learnjs.template = function(name) {
	return $(".templates ." + name).clone();
};

learnjs.buildCorrectFlash = function(problemNumber) {
	var text = learnjs.template("correct-flash");
	var link = text.find("a");
	
	if (problemNumber < learnjs.problems.length) {
		link.attr("href", "#problem-" + (problemNumber+1));
	} else {
		link.attr("href", "#");
		link.text("You're finished!");
	}
	return text;
};

learnjs.landingView = function() {
	return learnjs.template("landing-view");
};

learnjs.problemView = function (data) {
	var problemNumber = parseInt(data, 10);
	var view = learnjs.template("problem-view");

	var problemData = learnjs.problems[problemNumber-1];
	
	var resultFlash = view.find(".result");
	function checkAnswer() {
		var answer = view.find(".answer").val();
		var test = problemData.code.replace("__", answer) + "; problem();";
		return eval(test);
	}
	
	function checkAnswerClick() {
		var text;
		if (checkAnswer()) {
			text = learnjs.buildCorrectFlash(problemNumber);
			learnjs.saveAnswer(problemNumber, view.find(".answer").val());
		} else {
			text = learnjs.template("incorrect-flash");
		}
		learnjs.flashElement(resultFlash, text);
		return false;
	}
	
	view.find(".check-btn").click(checkAnswerClick);
	
	view.find(".title").text("Problem #" + problemNumber);
	learnjs.dataBind(problemData, view);
	
	if (problemNumber < learnjs.problems.length) {
		var buttonItem = learnjs.template("skip-btn");
		buttonItem.find("a").attr("href", "#problem-" + (problemNumber+1));
		$(".nav-list").append(buttonItem);
		view.bind("removingView", function() {
			buttonItem.remove();
		});
	}
	

	learnjs.fetchAnswer(problemNumber).then(function(data) {
		if (data.Item) {
			var ans = data.Item.answer;
			if (ans) {
				view.find(".answer").val(ans);
			}
		}
	});
			
	return view;
};

learnjs.profileView = function() {
	var view = learnjs.template("profile-view");
	learnjs.identity.done(function(identity) {
		view.find(".email").text(identity.email);
	});
	return view;
};

learnjs.addProfileLink = function(profile) {
	var link = learnjs.template("profile-link");
	link.find("a").text(profile.email);
	var signinBar = $(".signin-bar");
	signinBar.prepend(link);
};

learnjs.showView = function (hash) {
	var routes = {
		'#problem': learnjs.problemView,
		'#profile': learnjs.profileView,
		'': learnjs.landingView,
		'#': learnjs.landingView
	};

	var hashParts = hash.split('-');

	var viewFn = routes[hashParts[0]];
	if (viewFn) {
		learnjs.triggerEvent("removingView", []);
		$('.view-container').empty().append(viewFn(hashParts[1]));
	}
};

learnjs.appOnReady = function () {
	window.onhashchange = function () {
		learnjs.showView(window.location.hash);
	};
	learnjs.showView(window.location.hash);
	learnjs.identity.done(learnjs.addProfileLink);
};

learnjs.triggerEvent = function(name, args) {
	$('.view-container>*').trigger(name, args);
};



learnjs.awsRefresh = function() {
	var deferred = new $.Deferred();
	
	AWS.config.credentials.refresh(function(err) {
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(AWS.config.credentials.identityId);
		}
	});
	
	return deferred.promise();
};

learnjs.identity = new $.Deferred();

function googleSignIn(googleUser) {
	function refresh() {
		return gapi.auth2.getAuthInstance().signIn({
			prompt: "login"
		}).then(function(userupdate) {
			var creds = AWS.config.credentials;
			var newToken = userUpdate.getAuthResponse().id_token;
			creds.params.Logins['accounts.google.com'] = newToken;
			return learnjs.awsRefresh();
		});
	};
	
	var id_token = googleUser.getAuthResponse().id_token;
	AWS.config.update({
		region: "us-east-1",
		credentials: new AWS.CognitoIdentityCredentials({
			IdentityPoolId: learnjs.poolId,
			Logins: {
				'accounts.google.com': id_token
			}
		})
	});
	
	learnjs.awsRefresh().then(function(id) {
		learnjs.identity.resolve({
			id: id,
			email: googleUser.getBasicProfile().getEmail(),
			refresh: refresh
		})
	});
};

learnjs.sendDbRequest = function(req, retry) {
	
	var promise = $.Deferred();
	
	req.on("error", function(error) {
		if (error.code === "CredentialsError") {
			learnjs.identity.then(function(identity) {
				return identity.refresh.then(function() {
					return retry();
				}, function() {
					promise.reject(resp);
				})
			})
		} else {
			promise.reject(error);
		}
	});
	
	req.on("success", function(resp) {
		promise.resolve(resp.data);
	});
	
	req.send();
	
	return promise;
};


learnjs.saveAnswer = function(problemId, answer) {
	return learnjs.identity.then(function(identity) {
		var db= new AWS.DynamoDB.DocumentClient();
		var item= {
			TableName: "learnjs",
			Item: {
				userId: identity.id,
				problemId: problemId,
				answer: answer
			}
		};
		return learnjs.sendDbRequest(db.put(item), function() {
			return learnjs.saveAnswer(problemId, answer);
		});
	});
};


learnjs.fetchAnswer = function(problemId) {

	return learnjs.identity.then(function(identity) {
		var db = new AWS.DynamoDB.DocumentClient();
		var item = {
			TableName: "learnjs",
			Key: {
				userId: identity.id,
				problemId: problemId
			}
		};
		return learnjs.sendDbRequest(db.get(item), function() {
			return learnjs.fetchAnswer(problemId);
		});
	});
};