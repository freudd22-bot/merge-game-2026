const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = "database.json";

const API_KEY = process.env.API_KEY || "MERGE_GAME_2026_SECRET_KEY";
const CCP_NUMBER = process.env.CCP_NUMBER || "00799999000887214877";
const PHONE_NUMBER = process.env.PHONE_NUMBER || "0673121885";

function readDB() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }));
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// تسجيل مستخدم جديد أو جلب البيانات
app.post("/api/login", (req,res)=>{
    const { email, guestId } = req.body;
    let db = readDB();
    let id = email ? email : guestId;
    if(!db.users[id]){
        db.users[id] = { gems:100, points:0, da:0 }; // 100 جوهرة عند التسجيل
        writeDB(db);
    }
    res.json({ id, ...db.users[id] });
});

// دمج العناصر
app.post("/api/merge", (req,res)=>{
    const { id, el1, el2 } = req.body;
    let db = readDB();
    if(!db.users[id]) return res.status(400).json({ error:"User not found" });
    let user = db.users[id];
    if(user.gems<=0) return res.json({ message:"No gems left", gems:user.gems, points:user.points, da:user.da });

    user.gems--;
    let message="";
    if(el1===el2){ message="سبحان الله - Subhan Allah"; user.gems++; }
    else if((el1<4 && el2<4) || (el1>=4 && el2>=4)){ message="الحمد لله - Alhamdulillah"; user.points+=10; }
    else{ message="الله أكبر - Allahu Akbar"; }

    if(user.points>=1000){
        let earnedDA = Math.floor(user.points/1000)*10;
        user.da += earnedDA;
        user.points = user.points % 1000;
        message += ` | حصلت على ${earnedDA} DA!`;
    }

    writeDB(db);
    res.json({ message, gems:user.gems, points:user.points, da:user.da });
});

// شحن الجواهر (شراء)
app.post("/api/charge", (req,res)=>{
    const key = req.headers['x-api-key'];
    if(key!==API_KEY) return res.status(403).json({ error:"Invalid API Key" });

    const { id, gems } = req.body;
    let db = readDB();
    if(!db.users[id]) return res.status(400).json({ error:"User not found" });

    db.users[id].gems += Number(gems);
    writeDB(db);

    // إشعار عند شحن الجواهر
    console.log(`تم شحن ${gems} جواهر للمستخدم ${id} | إشعار على الهاتف: ${PHONE_NUMBER} أو CCP: ${CCP_NUMBER}`);

    res.json({ message:"Gems added", balance:db.users[id].gems });
});

// استعراض الرصيد
app.get("/api/balance/:id",(req,res)=>{
    let db = readDB();
    const { id } = req.params;
    if(!db.users[id]) return res.json({ gems:0, points:0, da:0 });
    res.json(db.users[id]);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));