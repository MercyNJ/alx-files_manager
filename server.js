import express from 'express';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 5000;

// Use routes from the 'routes' file
app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
