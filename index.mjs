import express from "express";
import multer from "multer";
import moment from "moment";
import cors from "cors";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import db2 from "./db.mjs";

const defaultData = { user: [], products: [] };
const db = new Low(new JSONFile("db.json"), defaultData);
await db.read();

const upload = multer();

let whiteList = [
	"http://localhost:5500",
	"http://127.0.0.1:5500",
	"http://localhost:3000",
	"http://127.0.0.1:3000",
];
let corsOption = {
	credentials: true,
	origin(origin, callback) {
		if (!origin || whiteList.includes(origin)) {
			callback(null, true);
		} else {
			callback(new Error("不允許連線"));
		}
	},
};

const app = express();
app.use(cors(corsOption));

app.get("/", (req, res) => {
	res.send("首頁");
});

app.get("/api/data", async (req, res) => {
	try {
		const [rows] = await db2.query("SELECT * FROM `product`"); // 確認資料表名稱是否正確
		res.json(rows);
	} catch (err) {
		console.error("查詢錯誤：", err);
		res.status(500).send(err);
	}
});

app.listen(3005, () => {
	console.log("server is running at http://localhost:3005");
});

function checkToken(req, res, next) {
	// postman測試： 使用者登出 http://localhost:3000/api/users/logout 選擇Authorization 選擇Bearer Token，手動輸入token，之後可在Header頁籤看到Key=Authorization，確認有帶入

	let token = req.get("Authorization");

	if (token && token.indexOf("Bearer") == 0) {
		// token前會帶"bearer "[token......
		token = token.slice(7);
		jwt.verify(token, process.env.SECRET_KEY, (error, decoded) => {
			if (error) {
				return res.status(401).json({
					result: "fail",
					message: "驗證失敗，請重新登入。",
				});
			}
			//decoded：如果 JWT 驗證成功，decoded 會包含 JWT 的有效荷載（Payload），即 token 中的內容。例如，token 內部可能包含使用者的帳號、姓名、email 等資訊。這些資訊會被解碼並賦值給 req.decoded，使得後續的中間件或路由處理可以使用這些資訊。
			//當 token 驗證成功時，decoded 會被設置為 token 的解碼內容，並呼叫 next() 繼續進入下一個中間件。
			req.decoded = decoded;
			next();
		});
	} else {
		return res.status(401).json({
			result: "fail",
			message: "沒有驗證資料，請重新登入。",
		});
	}
	// console.log(token);
	// Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50IjoiYmVuIiwibmFtZSI6IkJlbiBDaGVuIDIiLCJtYWlsIjoiYmVuQGdtYWlsLmNvbSIsImhlYWQiOiJodHRwczovL3JhbmRvbXVzZXIubWUvYXBpL3BvcnRyYWl0cy9tZW4vNTguanBnIiwiaWF0IjoxNzI5NTYxOTgxLCJleHAiOjE3Mjk1NjM3ODF9.Ryg3uLIitwJLhQKdwvN8LyxGBLa3A7zJ7IFcLQMzf5s
}
