import dotenv from 'dotenv';
import dynamoose from 'dynamoose';

dotenv.config();

const client = new dynamoose.aws.ddb.DynamoDB({
	"credentials": {
		"accessKeyId": process.env.AWS_ACCESS_KEY_ID as string,
		"secretAccessKey": process.env.AWS_SECRET_ACCESS_KEY as string,
	},
	"region": process.env.AWS_REGION as string,
});

dynamoose.aws.ddb.set(client);

export const articleSchema = new dynamoose.Schema({
  id: String,
  title: {
    type: String,
    required: true,
    index: {
      name: 'TitleIndex',
      type: 'global',
    },
  },
  content: String,
  imageUrl: String,
  uploaded: Boolean,
}, {
  timestamps: true,
  saveUnknown: false,
});

export const Article = dynamoose.model('Article', articleSchema);
