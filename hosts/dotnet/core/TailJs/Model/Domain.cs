using System;

namespace TailJs.Model;

/// <summary>
/// Represents a domain name, e.g. https://www.foo.co.uk
/// </summary>
public record Domain(
  string Protocol,
  string DomainName
)
{
  public string Protocol { get; set; } = Protocol;
  
  public string DomainName { get; set; } = DomainName;
}


