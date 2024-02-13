import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../server'; // Assuming your app instance is exported

chai.use(chaiHttp);
const { expect } = chai;

function generateValidBase64Credentials() {
  // Replace 'username' and 'password' with your valid credentials
  const credentials = Buffer.from('username:password').toString('base64');
  return credentials;
}

describe('/files', () => {
  it('should return status 200 with an array of files for GET /files', async () => {
    // Assuming you have a function to generate a valid Base64-encoded credentials
    const validBase64Credentials = generateValidBase64Credentials();

    // Connect and get a valid token using Basic Authentication
    const authResponse = await chai.request(app)
      .get('/connect')
      .set('Authorization', `Basic ${validBase64Credentials}`);

    expect(authResponse).to.have.status(200);
    expect(authResponse.body).to.have.property('token');
    const validToken = authResponse.body.token;

    // Now use the valid token in the request to /files
    const res = await chai.request(app)
      .get('/files')
      .set('x-token', validToken);

    expect(res).to.have.status(200);
    expect(res.body).to.be.an('array');
  });

  it('should return status 401 for GET /files without a valid token', async () => {
    const res = await chai.request(app).get('/files');
    expect(res).to.have.status(401);
  });

  it('should return status 400 for GET /files with an invalid parentId format', async () => {
    const res = await chai
      .request(app)
      .get('/files')
      .set('x-token', 'yourAuthToken')
      .query({ parentId: 'invalidIdFormat' });
    expect(res).to.have.status(400);
  });

  it('should return status 200 with an array of files for GET /files with a valid token and parentId', async () => {
    const res = await chai
      .request(app)
      .get('/files')
      .set('x-token', 'yourAuthToken')
      .query({ parentId: 'validParentId' });
    expect(res).to.have.status(200);
    expect(res.body).to.be.an('array');
  });

  it('should return status 200 with an array of files for GET /files with a valid token and page parameter', async () => {
    const res = await chai
      .request(app)
      .get('/files')
      .set('x-token', 'yourAuthToken')
      .query({ page: 1 });
    expect(res).to.have.status(200);
    expect(res.body).to.be.an('array');
  });

  // Add more tests for /files routes as needed
});
