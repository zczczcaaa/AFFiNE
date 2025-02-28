// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class GetUserByEmailQuery: GraphQLQuery {
  public static let operationName: String = "getUserByEmail"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"query getUserByEmail($email: String!) { userByEmail(email: $email) { __typename id name email features hasPassword emailVerified avatarUrl quota { __typename humanReadable { __typename blobLimit historyPeriod memberLimit name storageQuota } } } }"#
    ))

  public var email: String

  public init(email: String) {
    self.email = email
  }

  public var __variables: Variables? { ["email": email] }

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Query }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("userByEmail", UserByEmail?.self, arguments: ["email": .variable("email")]),
    ] }

    /// Get user by email for admin
    public var userByEmail: UserByEmail? { __data["userByEmail"] }

    /// UserByEmail
    ///
    /// Parent Type: `UserType`
    public struct UserByEmail: AffineGraphQL.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.UserType }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .field("id", AffineGraphQL.ID.self),
        .field("name", String.self),
        .field("email", String.self),
        .field("features", [GraphQLEnum<AffineGraphQL.FeatureType>].self),
        .field("hasPassword", Bool?.self),
        .field("emailVerified", Bool.self),
        .field("avatarUrl", String?.self),
        .field("quota", Quota.self),
      ] }

      public var id: AffineGraphQL.ID { __data["id"] }
      /// User name
      public var name: String { __data["name"] }
      /// User email
      public var email: String { __data["email"] }
      /// Enabled features of a user
      public var features: [GraphQLEnum<AffineGraphQL.FeatureType>] { __data["features"] }
      /// User password has been set
      public var hasPassword: Bool? { __data["hasPassword"] }
      /// User email verified
      public var emailVerified: Bool { __data["emailVerified"] }
      /// User avatar url
      public var avatarUrl: String? { __data["avatarUrl"] }
      public var quota: Quota { __data["quota"] }

      /// UserByEmail.Quota
      ///
      /// Parent Type: `UserQuotaType`
      public struct Quota: AffineGraphQL.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.UserQuotaType }
        public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("humanReadable", HumanReadable.self),
        ] }

        public var humanReadable: HumanReadable { __data["humanReadable"] }

        /// UserByEmail.Quota.HumanReadable
        ///
        /// Parent Type: `UserQuotaHumanReadableType`
        public struct HumanReadable: AffineGraphQL.SelectionSet {
          public let __data: DataDict
          public init(_dataDict: DataDict) { __data = _dataDict }

          public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.UserQuotaHumanReadableType }
          public static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("blobLimit", String.self),
            .field("historyPeriod", String.self),
            .field("memberLimit", String.self),
            .field("name", String.self),
            .field("storageQuota", String.self),
          ] }

          public var blobLimit: String { __data["blobLimit"] }
          public var historyPeriod: String { __data["historyPeriod"] }
          public var memberLimit: String { __data["memberLimit"] }
          public var name: String { __data["name"] }
          public var storageQuota: String { __data["storageQuota"] }
        }
      }
    }
  }
}
