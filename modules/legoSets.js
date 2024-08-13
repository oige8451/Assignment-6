require('dotenv').config();
require('pg'); 
const Sequelize = require('sequelize');


const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  port: process.env.DB_PORT,
  dialectOptions: {
    ssl: { rejectUnauthorized: false },
  },
});

const Theme = sequelize.define('Theme', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING
  }
}, {
  timestamps: false // Disable createdAt and updatedAt fields
});

// Define the Set model
const Set = sequelize.define('Set', {
  set_num: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  name: {
    type: Sequelize.STRING
  },
  year: {
    type: Sequelize.INTEGER
  },
  num_parts: {
    type: Sequelize.INTEGER
  },
  theme_id: {
    type: Sequelize.INTEGER
  },
  img_url: {
    type: Sequelize.STRING
  }
}, {
  timestamps: false // Disable createdAt and updatedAt fields
});

// Create association between Set and Theme
Set.belongsTo(Theme, { foreignKey: 'theme_id' });


// Function to initialize the database
function initialize() {
  return sequelize.sync()
    .then(() => {
      console.log('Database synced successfully');
    })
    .catch((err) => {
      console.error('Unable to sync the database:', err.message || err);
    });
}

// Function to return all sets
function getAllSets() {
  return new Promise((resolve, reject) => {
    Set.findAll({ include: [Theme] })
      .then((sets) => resolve(sets))
      .catch((err) => reject(`Unable to retrieve sets: ${err}`));
  });
}

// Function to return a specific set by its set_num
function getSetByNum(setNum) {
  return new Promise((resolve, reject) => {
    Set.findOne({ where: { set_num: setNum } })
      .then((set) => {
        if (set) {
          resolve(set);
        } else {
          reject(`Unable to find requested set with set_num: ${setNum}`);
        }
      })
      .catch((err) => reject(`Unable to retrieve set: ${err}`));
  });
}
// Function to return an array of sets that match a given theme (case-insensitive)
function getSetsByTheme(theme) {
  return new Promise((resolve, reject) => {
    Set.findAll({
      include: [Theme],
      where: {
        '$Theme.name$': {
          [Sequelize.Op.iLike]: `%${theme}%`
        }
      }
    })
      .then((sets) => {
        if (sets.length > 0) {
          resolve(sets);
        } else {
          reject(`Unable to find requested sets for theme: ${theme}`);
        }
      })
      .catch((err) => reject(`Unable to retrieve sets: ${err}`));
  });
}

function addSet(setData) {
  return Set.create(setData)
    .then(() => {
      // Resolve the promise with no data on success
      return Promise.resolve();
    })
    .catch(err => {
      // Reject the promise with the error message
      return Promise.reject(err.errors[0].message);
    });
  }

  function getAllThemes() {
    return Theme.findAll()
      .then(themes => {
        // Resolve the promise with the themes
        return Promise.resolve(themes);
      })
      .catch(err => {
        // Reject the promise with an error message 
        return Promise.reject(`Error retrieving themes: ${err.message}`);
      });
  }

  function editSet(set_num, setData) {
    return new Promise((resolve, reject) => {
      Set.update(setData, {
        where: {
          set_num: set_num
        }
      })
      .then(([affectedRows]) => {
        if (affectedRows > 0) {
          resolve(); // Successfully updated
        } else {
          reject(`No set found with set_num: ${set_num}`); 
        }
      })
      .catch((err) => {
        const errorMessage = err.errors && err.errors.length > 0 ? err.errors[0].message : err.message;
        reject(errorMessage); // Reject with the error message
      });
    });
  }

  function deleteSet(set_num) {
    return new Promise((resolve, reject) => {
        Set.destroy({ 
          where: { set_num: set_num }
        })
        .then(deletedCount => {
          if (deletedCount === 0) {
              // No rows deleted, meaning the set_num did not exist
              reject(new Error(`No set found with set_num ${set_num}`));
          } else {
              // Successfully deleted
              resolve();
          }
      })
      .catch(err => {
        const errorMessage = err.errors && err.errors.length > 0 ? err.errors[0].message : err.message;
        reject(errorMessage); // Reject with the error message
      });
  });
}

// Exporting the functions to be used in other modules
module.exports = {
  initialize,
  getAllSets,
  getSetByNum,
  getSetsByTheme,
  addSet, 
  getAllThemes, 
  editSet,
  deleteSet,
  sequelize,
  Theme,
  Set
};

