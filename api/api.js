var api = require("express").Router({caseSensitive: true, strict: true});
var models  = require('../models');

var filterRecord = function (record) {
  //console.log(record)
  delete record["category_id"];
  delete record["carrier_id"];
  delete record["pattern_id"];
  delete record["issue_id"];
  delete record["language_id"];
  delete record["collector_id"];
  /*
  record["category"] = record["category"]["name"];
  record["carrier"] = record["carrier"]["name"];
  record["pattern"] = record["pattern"]["name"];
  record["issue"] = record["issue"]["name"];
  record["language"] = record["language"]["name"];
  record["collector"] = record["collector"]["name"];
  */
  record["keywords"].forEach(function (keyword, index, keywords) {
    //keywords[index] = keyword["name"];
    delete keywords[index]["_pivot_record_id"];
    delete keywords[index]["_pivot_keyword_id"];
  })
  return record;
}

var filterRecords = function (records) {
  if(!records) {
    records = [];
  } else {
    records = records.toJSON();
  }
  records.forEach(function (record, index, records) {
    records[index] = filterRecord(record);
  })
  return records;
}


api.get('/records/', function (req, res, next) {
  var query = req.query.query;
  var offset = req.query.offset;
  var limit = req.query.limit;
  if (!offset){
    offset = 0;
  }
  if (!query) {
    models.Record.query(function (qb) {
      qb.limit(limit).offset(offset)
    })
    .fetchAll({withRelated: ['category', 'carrier', 'collector', 'issue', 'language', 'pattern', 'keywords']})
    .then(function (records){
      models.knex('records').count('*').then(function (ret){
        res.json({
          status: "success",
          records: filterRecords(records),
          count: parseInt(ret[0].count)
        });
      });
    })
  } else {
    query = '%' + query + '%';
    models.Record.query(function (qb) {
      qb.where('title', 'LIKE', query).orWhere('content', 'LIKE', query).orWhere('catalog', 'LIKE', query).limit(limit).offset(offset)
    })
    .fetchAll({withRelated: ['category', 'carrier', 'collector', 'issue', 'language', 'pattern', 'keywords']})
    .then(function (records){
      models.knex('records').count('*').where('title', 'LIKE', query).orWhere('content', 'LIKE', query).orWhere('catalog', 'LIKE', query).then(function (ret){
        res.json({
          status: "success",
          records: filterRecords(records),
          count: parseInt(ret[0].count)
        });
      });
    })
  }
});
api.get('/records/:id/', function (req, res, next) {
  var id = req.params.id
  if (isNaN(id)) {
    new models.Record({identifier: id}).fetch({withRelated: ['category', 'carrier', 'collector', 'issue', 'language', 'pattern', 'keywords']})
    .then(function (record) {
      if(record) {
        return res.json({
          status: "success",
          record: filterRecord(record.toJSON()),
        });
      } else {
        return res.json({
          status: "failed",
          error: 'not found'
        });
      }
    })
  } else {
    new models.Record({id: id}).fetch({withRelated: ['category', 'carrier', 'collector', 'issue', 'language', 'pattern', 'keywords']})
    .then(function (record) {
      if(record) {
        return res.json({
          status: "success",
          record: filterRecord(record.toJSON()),
        });
      } else {
        return res.json({
          status: "failed",
          error: 'not found'
        });
      }
    })
  }
});

api.get('/keywords/', function (req, res, next) {
  var query = req.query.query;
  var offset = req.query.offset;
  var limit = req.query.limit;
  if (query) {
    query = '%' + query + '%'
    models.Keyword.query(function (qb) {
      qb.where('name', 'LIKE', query).limit(limit).offset(offset)
    })
    .fetchAll()
    .then(function (keywords){
      models.knex('keywords').count('*').where('name', 'LIKE', query).then(function (ret){
        res.json({
          status: "success",
          keywords: keywords.toJSON(),
          count: parseInt(ret[0].count)
        });
      });
    })

  } else {
    models.Keyword.query(function (qb) {
      qb.limit(limit).offset(offset)
    })
    .fetchAll()
    .then(function (keywords){
      models.knex('keywords').count('*').then(function (ret){
        res.json({
          status: "success",
          keywords: keywords.toJSON(),
          count: parseInt(ret[0].count)
        });
      });
    })
  }
});

api.get('/keywords/:id/', function (req, res, next) {
  var id = req.params.id;
  if (isNaN(id)) {
    new models.Keyword({name: id}).fetch()
    .then(function (keyword) {
      if(keyword) {
        return res.json({
          status: "success",
          keyword: keyword.toJSON(),
        });
      } else {
        return res.json({
          status: "failed",
          error: 'not found'
        });
      }
    })
  } else {
    new models.Keyword({id: id}).fetch()
    .then(function (keyword) {
      if(keyword) {
        return res.json({
          status: "success",
          keyword: keyword.toJSON(),
        });
      } else {
        return res.json({
          status: "failed",
          error: 'not found'
        });
      }
    })
  }

});

api.get('/keywords/:id/records/', function (req, res, next) {
  var id = req.params.id;
  var offset = req.query.offset;
  var limit = req.query.limit;
  if (isNaN(id)) {
    var query = '%' + id + '%'
    models.knex.raw("SELECT keywords_records.record_id \
      FROM keywords_records INNER JOIN keywords ON keywords_records.keyword_id = keywords.id \
      WHERE keywords.name LIKE ? \
      GROUP BY keywords_records.record_id;", [query])
    .then(function (ret){
      ret = ret.rows
      if(!ret) {
        return res.json({
          status: "success",
          record: [],
          count: 0
        });
      } else {
        ret.forEach(function (record, index, records) {
          records[index] = record["record_id"];
        })
        models.Record.query(function (qb) {
            qb.where('id', 'in', ret).limit(limit).offset(offset)
          })
          .fetchAll({withRelated: ['category', 'carrier', 'collector', 'issue', 'language', 'pattern', 'keywords']})
          .then(function (records){
            return res.json({
              status: "success",
              record: filterRecords(records),
              count: ret.length
            });
          })
      }
    })
  } else {
    models.knex.raw("SELECT keywords_records.record_id \
      FROM keywords_records INNER JOIN keywords ON keywords_records.keyword_id = keywords.id \
      WHERE keywords.id = ? \
      GROUP BY keywords_records.record_id;", [id])
    .then(function (ret){
      ret = ret.rows
      if(!ret) {
        return res.json({
          status: "success",
          record: [],
          count: 0
        });
      } else {
        ret.forEach(function (record, index, records) {
          records[index] = record["record_id"];
        })
        models.Record.query(function (qb) {
            qb.where('id', 'in', ret).limit(limit).offset(offset)
          })
          .fetchAll({withRelated: ['category', 'carrier', 'collector', 'issue', 'language', 'pattern', 'keywords']})
          .then(function (records){
            return res.json({
              status: "success",
              record: filterRecords(records),
              count: ret.length
            });
          })
      }
    })
  }
});

module.exports = api;
