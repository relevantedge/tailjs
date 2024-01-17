namespace TailJs;

public record ClientResponseCookie : TrackerCookie
{
  public ClientResponseCookie(
    string name,
    string value,
    int? maxAge,
    bool httpOnly,
    SameSitePolicy sameSitePolicy,
    bool isEssential,
    bool secure,
    string headerString
  ) : base(value, maxAge, httpOnly, sameSitePolicy, isEssential)
  {
    Name = name;
    HeaderString = headerString;
    Secure = secure;
  }

  public string Name { get; }

  public string HeaderString { get; }

  public bool Secure { get; }
}
