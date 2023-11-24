"use strict";
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const { Schema } = mongoose;

//db connection

mongoose.connect(process.env.DB_URI);

// Schema Models


const IssueSchema = new Schema({
  issue_title: { type: String, required: true },
  issue_text: { type: String, required: true },
  created_on: Date,
  updated_on: Date,
  created_by: { type: String, required: true },
  assigned_to: String,
  open: Boolean,
  status_text: String,
});
const IssueModel = mongoose.model("Issue", IssueSchema);

const ProjectSchema = new Schema({
  name: { type: String, required: true },
  issues: [IssueSchema],
});
const ProjectModel = mongoose.model("Project", ProjectSchema);

// app funtions

module.exports = function (app) {
  app
    .route("/api/issues/:project")
    .get(function (req, res) {
      let projectName = req.params.project;
      //?open=true&assigned_to=Joe
      const {
        _id,
        open,
        issue_title,
        issue_text,
        created_by,
        assigned_to,
        status_text,
      } = req.query;

      ProjectModel
        .aggregate([
          { $match: { name: projectName } },
          { $unwind: "$issues" },
          _id != undefined
            ? { $match: { "issues._id": new ObjectId(_id) } }
            : { $match: {} },
          open != undefined
            ? { $match: { "issues.open": open } }
            : { $match: {} },
          issue_title != undefined
            ? { $match: { "issues.issue_title": issue_title } }
            : { $match: {} },
          issue_text != undefined
            ? { $match: { "issues.issue_text": issue_text } }
            : { $match: {} },
          created_by != undefined
            ? { $match: { "issues.created_by": created_by } }
            : { $match: {} },
          assigned_to != undefined
            ? { $match: { "issues.assigned_to": assigned_to } }
            : { $match: {} },
          status_text != undefined
            ? { $match: { "issues.status_text": status_text } }
            : { $match: {} },
      ])
        .exec()
        .then(data => {
          if (!data) {
            res.json([]);
          } else {
            let mappedData = data.map((item) => item.issues);
            res.json(mappedData);
        }
      })
        .catch(err => {
          return res.json({error: err})
      });
    
    })

    .post(function (req, res) {
      let project = req.params.project;
      const {
        issue_title,
        issue_text,
        created_by,
        assigned_to,
        status_text,
      } = req.body;
      if (!issue_title || !issue_text || !created_by) {
        res.json({ error: "required field(s) missing" });
        return;
      }

      const newIssue = new IssueModel({
        issue_title: issue_title || "",
        issue_text: issue_text || "",
        created_on: new Date(),
        updated_on: new Date(),
        created_by: created_by || "",
        assigned_to: assigned_to || "",
        open: true,
        status_text: status_text || "",
      });

      ProjectModel
        .findOne({ name: project })
        .then(projectdata => {
          if (!projectdata) {
            const newProject = new ProjectModel({ name: project });
            newProject.issues.push(newIssue);
            newProject
              .save()
              .then(data => {
                if (!data) {
              res.send("There was an error saving in post");
                } else {
                res.json(newIssue);
            }
          });
        } else {
          projectdata.issues.push(newIssue);
          projectdata
            .save()
            .then(data => {
              if (!data) {
                res.send("There was an error saving in post");
            } else {
              res.json(newIssue);
            }
          });
        }
      })
      .catch(err => {
        return res.json({error: err})
    });
    })

    .put(function (req, res) {
      let project = req.params.project;
      const {
        _id,
        issue_title,
        issue_text,
        created_by,
        assigned_to,
        status_text,
        open,
      } = req.body;
      if (!_id) {
        res.json({ error: "missing _id" });
        return;
      }

      if (
        !issue_title &&
        !issue_text &&
        !created_by &&
        !assigned_to &&
        !status_text &&
        !open
      ) {
        res.json({ error: "no update field(s) sent", _id: _id });
        return;
      }

      ProjectModel
        .findOne({ name: project })
        .then(projectdata => {
          if (!projectdata) {
            res.json({ error: "could not update", _id: _id });
        } else {
          const issueData = projectdata.issues.id(_id);
          if (!issueData) {
            res.json({ error: "could not update", _id: _id });
            return;
          }

          issueData.issue_title = issue_title || issueData.issue_title;
          issueData.issue_text = issue_text || issueData.issue_text;
          issueData.created_by = created_by || issueData.created_by;
          issueData.assigned_to = assigned_to || issueData.assigned_to;
          issueData.status_text = status_text || issueData.status_text;
          issueData.updated_on = new Date();
          issueData.open = open;
          

          projectdata
            .save()
            .then(data => {
              if (!data) {
                return res.json({ error: "could not update", _id: _id });
              } else {
                return res.json({ result: "successfully updated", _id: _id });
                
            }
          })
        }          
      })
      .catch(err => {
        return res.json({error: err})
    });
    })

    .delete(function (req, res) {
      let project = req.params.project;
      const { _id } = req.body;
      if (!_id) {
        res.json({ error: "missing _id" });
        return;
      }
      
      ProjectModel
        .findOne({ name: project })
        .exec()
        .then(projectdata => {
          if (!projectdata) {
            res.json({ error: "could not delete", _id: _id });
          } else {
          const issueData = projectdata.issues.id(_id);
          if (!issueData) {
            res.json({ error: "could not delete", _id: _id });
            return;
          }
          issueData.deleteOne();

          projectdata
            .save()
            .then(data => {
              if (!data) {
                return res.json({ error: "could not delete", _id: issueData._id });
              } else {
                return res.json({ result: "successfully deleted", _id: issueData._id });
            }
          });
        }
      })
      .catch(err => {
        return res.json({error: err})
    });
    });
};