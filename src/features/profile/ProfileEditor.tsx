import { useEffect, useState } from "react";
import { academyTracks } from "../../content/academy";
import { setPreferences, usePreferences } from "../../preferences/store";
import { validNickname } from "../../preferences/model";
export function ProfileEditor() {
  const preferences = usePreferences(), [nickname, setNickname] = useState(preferences.nickname), [message, setMessage] = useState("");
  const [clearProfile, setClearProfile] = useState(false);
  useEffect(() => { setNickname(preferences.nickname); }, [preferences.nickname]);
  return <form className="profile-editor" onSubmit={e => { e.preventDefault(); if (!validNickname(nickname)) { setMessage("昵称最多24个字符，不能含控制或隐藏格式字符。"); return; } setPreferences({ nickname }); setMessage("个人资料已保存到本机。"); }}>
    <label>昵称<input value={nickname} onChange={e => { setNickname(e.target.value); setMessage(""); }} autoComplete="off" aria-describedby="nickname-help" /></label>
    <p id="nickname-help" className="muted">最多24个字符，留空显示“学习者”。只保存在此浏览器，不需要账号。</p>
    <label>偏好学习路线<select value={preferences.learningPath} onChange={e => setPreferences({ learningPath: e.target.value as typeof preferences.learningPath })}><option value="">自由探索</option>{academyTracks.map(t => <option key={t.id} value={t.id.toLowerCase()}>{t.id} · {t.title}</option>)}</select></label>
    <p className="muted">影响首页下一课推荐；没有已上线内容时会推荐其他可学课程。</p>
    <button className="btn" type="submit">保存个人资料</button>
    <div className="profile-clear">
      <p>清除本机个人资料只会清除昵称和偏好学习路线；学习记录与其他设置保留。</p>
      {clearProfile ? <div className="row"><button className="btn danger-button" type="button" onClick={() => { setPreferences({ nickname: "", learningPath: "" }); setClearProfile(false); setMessage("本机昵称与学习路线偏好已清除，学习记录未改动。"); }}>确认清除个人资料</button><button className="btn ghost" type="button" onClick={() => setClearProfile(false)}>取消清除个人资料</button></div> : <button className="btn ghost" type="button" onClick={() => setClearProfile(true)}>清除本机个人资料</button>}
    </div>
    {message && <p role="status">{message}</p>}
  </form>;
}
