
describe("LearnJS", function () {
  
  it("can show a problem view", function () {
    learnjs.showView('#problem-1');
    expect($('.view-container .problem-view').length).toEqual(1);
  });

  it("shows the landing page when there is no hash", function () {
    learnjs.showView('');
    expect($('.view-container .landing-view').length).toEqual(1);
  });

  it("passes the hash view parameter to the view function", function () {
    spyOn(learnjs, "problemView");
    learnjs.showView("#problem-42");
    expect(learnjs.problemView).toHaveBeenCalledWith('42');
  });
  
  it("remove view event is triggered", function () {
    spyOn(learnjs, "triggerEvent");
    learnjs.showView("#problem-1");
    expect(learnjs.triggerEvent).toHaveBeenCalledWith('removingView', []);
  });

  it("invokes the router when loaded", function () {
    spyOn(learnjs, "showView");
    learnjs.appOnReady();
    expect(learnjs.showView).toHaveBeenCalledWith(window.location.hash);
  });

  it("subscribes to the hash change envent", function () {
    learnjs.appOnReady();
    spyOn(learnjs, "showView");
    $(window).trigger("hashchange");
    expect(learnjs.showView).toHaveBeenCalledWith(window.location.hash);
  });
  
  it("can perform a trigger", function() {
    // need to show a view for the events to work
    learnjs.showView("");
    var called = false;
    $(".view-container").bind("test-event", function() {
      called = true;
    });
    
    learnjs.triggerEvent("test-event", "nothing");
    expect(called).toEqual(true);
    
  });

  describe("problem view", function () {
    
    it("has a title that includes the problem number", function () {
      var view = learnjs.problemView("1");
      expect(view.find(".title").text()).toEqual("Problem #1");
    });

    it("databinds with the previous number", function () {
      spyOn(learnjs, "dataBind");
      var view = learnjs.problemView("1");
      expect(learnjs.dataBind).toHaveBeenCalled();
    });
  });


  describe("answer secton", function () {
    var view;
    
    beforeEach(function () {
      view = learnjs.problemView("1");
    });

    it("can check a correct answer by hitting a button", function () {
      view.find(".answer").val("true");
      view.find(".check-btn").click();
      expect(view.find(".correct-flash").length).toEqual(1);
    });
    
    it("can rejects an incorrect answer", function () {
      view.find(".answer").val("false");
      view.find(".check-btn").click();
      expect(view.find(".incorrect-flash").length).toEqual(1);
    });
    
    it("flash result on correct answer", function () {
      spyOn(learnjs, "flashElement");
      view.find(".answer").val("true");
      view.find(".check-btn").click();
      expect(learnjs.flashElement).toHaveBeenCalled();
    });
    
    it("flash result on incorrect answer", function () {
      spyOn(learnjs, "flashElement");
            view.find(".answer").val("false");
      view.find(".check-btn").click();
      expect(learnjs.flashElement).toHaveBeenCalled();
    });
    
    it("next link goes to next question", function() {
      var correctFlash = learnjs.buildCorrectFlash(0);
      expect(correctFlash.find("a").attr("href")).toEqual("#problem-1");
    });
        it("last link goes to index page", function() {
      var correctFlash = learnjs.buildCorrectFlash(learnjs.problems.length);
      expect(correctFlash.find("a").attr("href")).toEqual("#");
    });
  });

  describe("data binding", function () {
    it("binds the template view from the data properly", function () {
      var view = $(".templates .problem-view").clone();
      var data = {
        description: "description",
        code: "code"
      };
      learnjs.dataBind(data, view);
      expect(view.find("[data-name=description]").text()).toEqual("description");
      expect(view.find("[data-name=code]").text()).toEqual("code");
    });
  });
});
